// Import Octokit from the GitHub API
const { Octokit } = require('@octokit/rest');

// Initialize Octokit with a personal access token
const octokit = new Octokit({
  auth: process.env.TOKENSS_GITHUB // Set your GitHub token in environment variables
});

// Function to validate the existence of a repository in an organization
async function validateRepo(org, repoName) {
  try {
    // Fetch repository details
    await octokit.repos.get({
      owner: org,
      repo: repoName
    });
    console.log(`Repository ${repoName} found in organization ${org}`);
  } catch (error) {
    // Handle repository not found (404) or other errors
    if (error.status === 404) {
      console.error(`Repository ${repoName} not found in organization ${org}. Validation failed.`);
      process.exit(1); // Exit with failure status code
    } else {
      console.error('Error occurred while validating the repository:', error.message);
      process.exit(1); // Exit with failure status code
    }
  }
}

// Main function to validate repository
async function main() {
  const org = process.argv[2]; // Organization name from command-line argument
  const repoName = process.argv[3]; // Repository name from command-line argument

  if (!org || !repoName) {
    console.error('Usage: node validateRepo.js <org> <repo>');
    process.exit(1); // Exit with failure status code
  }

  await validateRepo(org, repoName);
}

// Run the main function
main();
