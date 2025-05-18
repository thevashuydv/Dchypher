import axios from 'axios';

// Backend API URL
const API_BASE_URL = 'http://localhost:3001/api';

// Sample repositories that users can test with
export const sampleRepositories = [
  {
    name: "JavaScript-Obfuscator",
    url: "https://github.com/javascript-obfuscator/javascript-obfuscator",
    filePath: "src/cli/JavaScriptObfuscatorCLI.ts"
  },
  {
    name: "UglifyJS",
    url: "https://github.com/mishoo/UglifyJS",
    filePath: "lib/minify.js"
  },
  {
    name: "jQuery",
    url: "https://github.com/jquery/jquery",
    filePath: "src/core.js"
  },
  {
    name: "Lodash",
    url: "https://github.com/lodash/lodash",
    filePath: "lodash.js"
  },
  {
    name: "Terser",
    url: "https://github.com/terser/terser",
    filePath: "lib/minify.js"
  },
  {
    name: "Babel",
    url: "https://github.com/babel/babel",
    filePath: "packages/babel-core/src/transform.js"
  },
  {
    name: "ESLint",
    url: "https://github.com/eslint/eslint",
    filePath: "lib/linter/linter.js"
  },
  {
    name: "Webpack",
    url: "https://github.com/webpack/webpack",
    filePath: "lib/webpack.js"
  },
  {
    name: "React",
    url: "https://github.com/facebook/react",
    filePath: "packages/react/src/React.js"
  },
  {
    name: "Vue.js",
    url: "https://github.com/vuejs/core",
    filePath: "packages/runtime-core/src/index.ts"
  }
];

/**
 * Analyze a GitHub repository for obfuscation timeline
 *
 * @param {string} repoUrl - The GitHub repository URL
 * @param {string} filePath - The path to the JavaScript file to analyze
 * @returns {Promise<Array>} - A promise that resolves to the timeline data
 */
export const analyzeRepository = async (repoUrl, filePath) => {
  try {
    console.log(`Analyzing repository: ${repoUrl}, file: ${filePath}`);

    // Start the analysis job
    const response = await axios.post(`${API_BASE_URL}/analyze`, { repoUrl, filePath });
    const { jobId } = response.data;

    console.log(`Analysis job started with ID: ${jobId}`);

    // Poll for job status
    return await pollJobStatus(jobId);
  } catch (error) {
    console.error('Error analyzing repository:', error);
    throw error;
  }
};

/**
 * Poll for job status until complete
 *
 * @param {string} jobId - The ID of the analysis job
 * @returns {Promise<Array>} - A promise that resolves to the timeline data
 */
const pollJobStatus = async (jobId) => {
  return new Promise((resolve, reject) => {
    const checkStatus = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/status/${jobId}`);
        const job = response.data;

        if (job.status === 'completed') {
          console.log('Analysis job completed successfully');
          resolve(job.result);
        } else if (job.status === 'failed') {
          console.error('Analysis job failed:', job.error);
          reject(new Error(job.error || 'Analysis failed'));
        } else {
          // Update progress in the UI
          window.dispatchEvent(new CustomEvent('analysisProgress', {
            detail: { progress: job.progress }
          }));

          // Check again after a delay
          setTimeout(checkStatus, 2000);
        }
      } catch (error) {
        console.error('Error checking job status:', error);
        reject(error);
      }
    };

    // Start polling
    checkStatus();
  });
};
