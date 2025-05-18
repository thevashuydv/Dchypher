const gitService = require('../services/gitService');
const codeAnalysisService = require('../services/codeAnalysisService');

// Track ongoing analyses
const analysisJobs = new Map();

exports.analyzeRepository = async (req, res) => {
  try {
    const { repoUrl, filePath } = req.body;

    if (!repoUrl || !filePath) {
      return res.status(400).json({ error: 'Repository URL and file path are required' });
    }

    console.log(`Starting analysis for repository: ${repoUrl}, file: ${filePath}`);

    // Generate a unique job ID
    const jobId = Date.now().toString();

    // Store job status
    analysisJobs.set(jobId, {
      status: 'processing',
      progress: 0,
      result: null
    });

    // Start analysis in background
    analyzeRepositoryAsync(jobId, repoUrl, filePath);

    // Return job ID to client
    res.status(202).json({ jobId });
  } catch (error) {
    console.error('Error starting repository analysis:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getAnalysisStatus = (req, res) => {
  const { id } = req.params;

  if (!analysisJobs.has(id)) {
    return res.status(404).json({ error: 'Analysis job not found' });
  }

  const job = analysisJobs.get(id);
  res.json(job);
};

async function analyzeRepositoryAsync(jobId, repoUrl, filePath) {
  try {
    // Clone repository
    console.log(`Cloning repository: ${repoUrl}`);
    const repoPath = await gitService.cloneRepository(repoUrl);
    updateJobProgress(jobId, 20);

    // Get commit history for the specific file
    console.log('Fetching commit history for file');
    const commits = await gitService.getFileCommitHistory(repoPath, filePath);
    updateJobProgress(jobId, 40);

    console.log(`Found ${commits.length} commits affecting the file`);

    // Analyze each commit
    const results = await analyzeCommits(repoPath, commits, filePath, jobId);

    // Update job with results
    analysisJobs.set(jobId, {
      status: 'completed',
      progress: 100,
      result: results
    });

    console.log(`Analysis completed for job ${jobId}`);

    // Clean up temporary files
    gitService.cleanupRepository(repoPath);
  } catch (error) {
    console.error(`Error during repository analysis for job ${jobId}:`, error);
    analysisJobs.set(jobId, {
      status: 'failed',
      progress: 0,
      error: error.message
    });
  }
}

async function analyzeCommits(repoPath, commits, filePath, jobId) {
  const results = [];
  const totalCommits = commits.length;

  // Limit the number of commits to analyze to prevent timeouts
  const MAX_COMMITS = 50;
  const commitsToAnalyze = commits.length > MAX_COMMITS
    ? commits.slice(0, MAX_COMMITS)
    : commits;

  if (commits.length > MAX_COMMITS) {
    console.log(`Repository has ${commits.length} commits, limiting analysis to the most recent ${MAX_COMMITS}`);
  }

  // Track successful analyses
  let successCount = 0;
  let previousCode = null;

  for (let i = 0; i < commitsToAnalyze.length; i++) {
    const commit = commitsToAnalyze[i];

    try {
      // Get file content at this commit
      const code = await gitService.getFileContentAtCommit(repoPath, filePath, commit.hash);

      // Skip empty files
      if (!code || code.trim().length === 0) {
        console.log(`File is empty in commit ${commit.hash}, skipping`);
        continue;
      }

      // Skip files that are too large
      const MAX_FILE_SIZE = 1000000; // 1MB
      if (code.length > MAX_FILE_SIZE) {
        console.log(`File is too large in commit ${commit.hash} (${code.length} bytes), skipping`);
        continue;
      }

      // Analyze code
      const analysis = await codeAnalysisService.analyzeCode(code, filePath);

      // If we have previous code, analyze the changes
      let changeAnalysis = null;
      if (previousCode) {
        changeAnalysis = await codeAnalysisService.analyzeCodeChanges(
          previousCode,
          code,
          filePath
        );
      }

      results.push({
        commitHash: commit.hash,
        timestamp: commit.date,
        message: commit.message,
        changeType: commit.changeType,
        score: analysis.score,
        metrics: analysis.metrics,
        changeAnalysis,
        formattedCode: analysis.formattedCode
      });

      previousCode = code;
      successCount++;
    } catch (error) {
      console.log(`Error analyzing commit ${commit.hash}: ${error.message}`);
      // Continue with next commit
    }

    // Update progress
    const progressIncrement = 60 / commitsToAnalyze.length;
    updateJobProgress(jobId, 40 + (i + 1) * progressIncrement);
  }

  // Log analysis summary
  console.log(`Analysis complete: ${successCount} of ${commitsToAnalyze.length} commits analyzed successfully`);

  // Sort results by timestamp
  results.sort((a, b) => a.timestamp - b.timestamp);

  return results;
}

function updateJobProgress(jobId, progress) {
  const job = analysisJobs.get(jobId);
  if (job) {
    job.progress = Math.round(progress);
    analysisJobs.set(jobId, job);
  }
}
