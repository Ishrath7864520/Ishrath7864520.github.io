import { Octokit } from "@octokit/core";
import process from 'process';

// Hardcoded values
const owner = 'Ishrath7864520';
const repo = 'Access-Auto';

// Ensure that the correct number of arguments is provided
if (process.argv.length < 5) {
  console.error('Usage: node close_issue_and_revoke_access.mjs <issue_number> <username> <comment>');
  process.exit(1);
}

// Get issue number, username, and comment from command-line arguments
const issueNumber = process.argv[2];
const username = process.argv[3];
const comment = process.argv[4];

const octokit = new Octokit({
  auth: process.env.TOKENSS_GITHUB, // Ensure TOKENSS_GITHUB is set in your environment variables
});

// Function to post a comment on an issue
async function postComment(owner, repo, issueNumber, comment) {
  try {
    const response = await octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/comments', {
      owner,
      repo,
      issue_number: issueNumber,
      body: comment,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    return response.data;
  } catch (error) {
    console.error(`Error posting comment for issue #${issueNumber} in ${owner}/${repo}:`, error.message);
    if (error.response) {
      console.error(`Response status: ${error.response.status}`);
      console.error(`Response headers: ${JSON.stringify(error.response.headers)}`);
      console.error(`Response data: ${JSON.stringify(error.response.data)}`);
    }
    return null;
  }
}

// Function to close an issue
async function closeIssue(owner, repo, issueNumber) {
  try {
    const response = await octokit.request('PATCH /repos/{owner}/{repo}/issues/{issue_number}', {
      owner,
      repo,
      issue_number: issueNumber,
      state: 'closed',
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    return response.data;
  } catch (error) {
    console.error(`Error closing issue #${issueNumber} in ${owner}/${repo}:`, error.message);
    if (error.response) {
      console.error(`Response status: ${error.response.status}`);
      console.error(`Response headers: ${JSON.stringify(error.response.headers)}`);
      console.error(`Response data: ${JSON.stringify(error.response.data)}`);
    }
    return null;
  }
}

// Function to revoke access for a user from a repository
async function revokeAccess(owner, repo, username) {
  try {
    const response = await octokit.request('DELETE /repos/{owner}/{repo}/collaborators/{username}', {
      owner,
      repo,
      username,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    console.log(`Access revoked for user ${username} from repository ${owner}/${repo}.`);
    return response.data;
  } catch (error) {
    console.error(`Error revoking access for user ${username} from repository ${owner}/${repo}:`, error.message);
    if (error.response) {
      console.error(`Response status: ${error.response.status}`);
      console.error(`Response headers: ${JSON.stringify(error.response.headers)}`);
      console.error(`Response data: ${JSON.stringify(error.response.data)}`);
    }
    return null;
  }
}

// Main function to post a comment, close the issue, and revoke access
async function main() {
  const commentResponse = await postComment(owner, repo, issueNumber, comment);

  if (commentResponse) {
    console.log(`Comment posted by ${username} on issue #${issueNumber}: ${comment}`);
    const closeResponse = await closeIssue(owner, repo, issueNumber);
    if (closeResponse) {
      console.log(`Issue #${issueNumber} has been closed.`);
      await revokeAccess(owner, repo, username);
    }
  }
}

// Run the script
main();
