
// Import the Octokit library
const { Octokit } = require("@octokit/core");

// Initialize Octokit with your personal access token
const octokit = new Octokit({
 auth: process.env.TOKENSS_GITHUB,
});


// Function to fetch team permission for a given repository
async function fetchTeamPermission(org, team_slug, repo_name) {
  try {
    const response = await octokit.request('GET /orgs/{org}/teams/{team_slug}/repos', {
      org: org,
      team_slug: team_slug,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    // Filter the response to find the specified repository
    const repo = response.data.find(r => r.name === repo_name);

    if (repo) {
      console.log(`Repository: ${repo.name}`);
      console.log(`Role Name: ${repo.role_name}`);
    } else {
      console.log(`Repository ${repo_name} not found in team ${team_slug}`);
    }
  } catch (error) {
    console.error('Error fetching team permissions:', error);
  }
}


// Replace with your actual values
const org = 'Ishrath7864520';
const team_slug = 'automation34';
const repo_name = 'is';

// Call the function
fetchTeamPermission(org, team_slug, repo_name);

