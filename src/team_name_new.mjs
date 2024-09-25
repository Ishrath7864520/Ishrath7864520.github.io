import { Octokit } from "@octokit/core";
import process from 'process';

// Ensure that the correct number of arguments is provided
if (process.argv.length < 6) {
  console.error('Usage: node fetchTeams.js <owner> <repo> <issue_number> <username>');
  process.exit(1);
}

// Get owner, repo, issue number, and username from command-line arguments
const ownerFromCLI = process.argv[2];
const repoFromCLI = process.argv[3];
const issueNumber = process.argv[4];
const username = process.argv[5];

// Hardcoded owner and repo for posting the comment
const hardcodedOwner = 'Ishrath7864520';
const hardcodedRepo = 'Access-Auto';

const octokit = new Octokit({
  auth: process.env.TOKENSS_GITHUB, // Ensure TOKENSS_GITHUB is set in your environment variables
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

// Function to create a markdown list of team names with checkboxes, including a default option
function createMarkdownList(teams, username) {
  let markdown = `@${username}, please select the team for which you want access by editing this comment and checking the appropriate box. <strong style="color: red;">Please select only one option:</strong>\n\n`;

  

  if (teams.length > 0) {
    teams.forEach(team => {
      markdown += `### Teams associated with ${ownerFromCLI}/${repoFromCLI}:\n`;
      markdown += `- [ ] ${team.name}\n`;
    });
  } else {
    markdown += `### No specific teams are associated with ${ownerFromCLI}/${repoFromCLI}:\n`;
  }

  // Add the default access option
  markdown += `\n- [ ] Default Access To The Repo \n`;

  return markdown;
}

// Function to post a comment on an issue
async function postComment(owner, repo, issueNumber, body) {
  try {
    await octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/comments', {
      owner,
      repo,
      issue_number: issueNumber,
      body
    });
    console.log('Comment posted successfully.');
  } catch (error) {
    console.error(`Error posting comment on issue ${issueNumber}:`, error.message);
    if (error.response) {
      console.error(`Response status: ${error.response.status}`);
      console.error(`Response headers: ${JSON.stringify(error.response.headers)}`);
      console.error(`Response data: ${JSON.stringify(error.response.data)}`);
    }
  }
}

// Main function to handle fetching teams and posting the comment
async function handleFetchTeamsAndPostComment() {
  try {
    const teams = await fetchTeams(ownerFromCLI, repoFromCLI);
    const markdown = createMarkdownList(teams, username);
    await postComment(hardcodedOwner, hardcodedRepo, issueNumber, markdown);
  } catch (error) {
    console.error('Error handling fetch teams and post comment:', error.message);
  }
}

// Run the script
handleFetchTeamsAndPostComment();
