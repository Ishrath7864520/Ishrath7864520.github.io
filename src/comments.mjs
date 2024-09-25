import { Octokit } from "@octokit/core";
import process from 'process';

// Hardcoded values
const owner = 'Ishrath7864520';
const repo = 'Access-Auto';

// Ensure that the correct number of arguments is provided
if (process.argv.length < 3) {
  console.error('Usage: node comments.mjs <issue_number>');
  process.exit(1);
}

// Get issue number from command-line arguments
const issueNumber = process.argv[2];

const octokit = new Octokit({
  auth: process.env.TOKENSS_GITHUB, // Ensure TOKENSS_GITHUB is set in your environment variables
});

// Function to fetch the comments of an issue
async function fetchComments(owner, repo, issueNumber) {
  try {
    const response = await octokit.request('GET /repos/{owner}/{repo}/issues/{issue_number}/comments', {
      owner,
      repo,
      issue_number: issueNumber,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    return response.data;
  } catch (error) {
    console.error(`Error fetching comments for issue #${issueNumber} in ${owner}/${repo}:`, error.message);
    if (error.response) {
      console.error(`Response status: ${error.response.status}`);
      console.error(`Response headers: ${JSON.stringify(error.response.headers)}`);
      console.error(`Response data: ${JSON.stringify(error.response.data)}`);
    }
    return [];
  }
}

// Function to extract selected team names from the markdown comment
function extractSelectedTeams(commentBody) {
  const selectedTeams = [];
  const lines = commentBody.split('\n');

  lines.forEach(line => {
    const match = line.match(/- \[x\] (.+)/i); // Match lines with checked checkboxes
    if (match) {
      let teamName = match[1].trim();
      teamName = teamName.replace(/ *\([^)]*\) */g, ""); // Remove text within parentheses
      if (teamName.toLowerCase() !== 'approve' && teamName.toLowerCase() !== 'reject') {
        selectedTeams.push(teamName);
      }
    }
  });

  return selectedTeams;
}

// Main function to fetch comments and extract selected team names
async function main() {
  const comments = await fetchComments(owner, repo, issueNumber);

  if (comments.length === 0) {
    console.log(`No comments found for issue #${issueNumber} in ${owner}/${repo}.`);
    return;
  }

  const allSelectedTeams = [];

  comments.forEach(comment => {
    const selectedTeams = extractSelectedTeams(comment.body);
    if (selectedTeams.length > 0) {
      allSelectedTeams.push(...selectedTeams);
    }
  });

  // Print only the team names
  allSelectedTeams.forEach(team => console.log(team));
}

// Run the script
main();
