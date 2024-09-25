import { Octokit } from "@octokit/core";
import process from 'process';

// Ensure that the correct number of arguments is provided
if (process.argv.length < 3) {
  console.error('Usage: node revokeAccess.js <username>');
  process.exit(1);
}

// Get username from command-line arguments
const username = process.argv[2];

// Hardcoded owner and repo
const hardcodedOwner = 'Ishrath7864520';
const hardcodedRepo = 'Access-Auto';

const octokit = new Octokit({
  auth: process.env.TOKENSS_GITHUB, // Ensure TOKEN_GITHUB is set in your environment variables
});

// Function to remove a user as a collaborator from the repository
async function removeCollaborator(owner, repo, username) {
  try {
    await octokit.request('DELETE /repos/{owner}/{repo}/collaborators/{username}', {
      owner,
      repo,
      username
    });
    console.log(`User ${username} removed as a collaborator from ${owner}/${repo}.`);
  } catch (error) {
    console.error(`Error removing user ${username} as a collaborator from ${owner}/${repo}:`, error.message);
    if (error.response) {
      console.error(`Response status: ${error.response.status}`);
      console.error(`Response headers: ${JSON.stringify(error.response.headers)}`);
      console.error(`Response data: ${JSON.stringify(error.response.data)}`);
    }
  }
}

// Main function to handle removing the user as a collaborator
async function handleRemoveCollaborator() {
  try {
    await removeCollaborator(hardcodedOwner, hardcodedRepo, username);
  } catch (error) {
    console.error('Error handling remove collaborator:', error.message);
  }
}

// Run the script
handleRemoveCollaborator();
