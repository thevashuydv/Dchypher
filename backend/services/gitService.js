const simpleGit = require('simple-git');
const fs = require('fs').promises;
const path = require('path');
const tmp = require('tmp');

// Create temporary directory for cloning
function createTempDir() {
  return new Promise((resolve, reject) => {
    tmp.dir({ unsafeCleanup: true }, (err, path, cleanup) => {
      if (err) return reject(err);
      resolve({ path, cleanup });
    });
  });
}

exports.cloneRepository = async (repoUrl) => {
  try {
    const { path: tempPath } = await createTempDir();
    console.log(`Created temporary directory: ${tempPath}`);

    // Validate repository URL
    if (!repoUrl || typeof repoUrl !== 'string') {
      throw new Error('Invalid repository URL');
    }

    // Clean up the repository URL
    const cleanRepoUrl = repoUrl.trim();

    const git = simpleGit();
    console.log(`Cloning repository ${cleanRepoUrl} to ${tempPath}`);
    
    // Clone with optimized options
    await git.clone(cleanRepoUrl, tempPath, {
      '--depth': 100,  // Increased depth for better history
      '--single-branch': true,
      '--no-tags': true
    });

    return tempPath;
  } catch (error) {
    console.error('Error cloning repository:', error);
    throw new Error(`Failed to clone repository: ${error.message}`);
  }
};

exports.getFileCommitHistory = async (repoPath, filePath) => {
  try {
    const git = simpleGit(repoPath);
    console.log(`Getting commit history for file: ${filePath}`);

    // Get commit log specifically for the file
    const log = await git.log({ file: filePath, maxCount: 100 });

    // Process commits with detailed change information
    const commits = await Promise.all(log.all.map(async (commit) => {
      try {
        // Get detailed change information for this commit
        const diffTree = await git.raw([
          'diff-tree',
          '--no-commit-id',
          '--name-status',
          '-r',
          commit.hash
        ]);

        // Parse the diff-tree output
        const changes = diffTree.split('\n')
          .filter(line => line.trim())
          .map(line => {
            const [status, file] = line.split('\t');
            return { status, file };
          })
          .find(change => change.file === filePath);

        return {
          hash: commit.hash,
          date: new Date(commit.date).getTime(),
          message: commit.message,
          changeType: changes ? changes.status : 'unknown'
        };
      } catch (error) {
        console.warn(`Warning: Could not get detailed changes for commit ${commit.hash}:`, error.message);
        return {
          hash: commit.hash,
          date: new Date(commit.date).getTime(),
          message: commit.message,
          changeType: 'unknown'
        };
      }
    }));

    console.log(`Found ${commits.length} commits affecting file ${filePath}`);
    return commits;
  } catch (error) {
    console.error('Error getting file commit history:', error);
    throw new Error(`Failed to get file commit history: ${error.message}`);
  }
};

exports.getFileContentAtCommit = async (repoPath, filePath, commitHash) => {
  try {
    const git = simpleGit(repoPath);
    console.log(`Getting file content at commit ${commitHash} for ${filePath}`);

    // Use git show to get file content at specific commit
    const content = await git.show([`${commitHash}:${filePath}`]);
    return content;
  } catch (error) {
    console.error(`Error getting file content at commit ${commitHash}:`, error);
    throw new Error(`Failed to get file content: ${error.message}`);
  }
};

exports.cleanupRepository = async (repoPath) => {
  try {
    console.log(`Cleaning up repository at ${repoPath}`);
    await fs.rm(repoPath, { recursive: true, force: true });
  } catch (error) {
    console.error(`Error cleaning up repository at ${repoPath}:`, error);
    // Don't throw, just log the error
  }
};
