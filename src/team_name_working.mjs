import { Octokit } from "@octokit/core";
import process from 'process';

// Ensure that the correct number of arguments is provided
if (process.argv.length < 4) {
  console.error('Usage: node fetchTeams.js <owner> <repo>');
  process.exit(1);
}

// Get owner and repo from command-line arguments
const owner = process.argv[2];
const repo = process.argv[3];

const octokit = new Octokit({
  auth: process.env.TOKENSS_GITHUB, // Ensure TOKEN_GITHUB is set in your environment variables
});

// Function to fetch teams for a repository
async function fetchTeams(owner, repo) {
  try {
    const response = await octokit.request('GET /repos/{owner}/{repo}/teams', {
      owner,
      repo,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching teams for ${owner}/${repo}:`, error.message);
    if (error.response) {
      console.error(`Response status: ${error.response.status}`);
      console.error(`Response headers: ${JSON.stringify(error.response.headers)}`);
      console.error(`Response data: ${JSON.stringify(error.response.data)}`);
    }
    return [];
  }
}

// Main function to handle fetching teams
async function handleFetchTeams() {
  try {
    const teams = await fetchTeams(owner, repo);
    if (teams.length === 0) {
      console.log(`No teams found for ${owner}/${repo}.`);
    } else {
      console.log(`Teams associated with ${owner}/${repo}:`);
      teams.forEach(team => {
        console.log(`- ${team.name}`);
      });
    }
  } catch (error) {
    console.error('Error handling fetch teams:', error.message);
  }
}

// Run the script
handleFetchTeams();
