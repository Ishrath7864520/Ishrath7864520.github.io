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
  auth: process.env.TOKENSS_GITHUB, // Ensure TOKEN_GITHUB is set in your environment variables
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
      return repo.role_name;
    } else {
      console.log(`Repository ${repo_name} not found in team ${team_slug}`);
      return null;
    }
  } catch (error) {
    console.error('Error fetching team permissions:', error);
    return null;
  }
}

// Function to fetch teams for a repository and their role names
async function fetchTeamsWithRoles(owner, repo) {
  try {
    const response = await octokit.request('GET /repos/{owner}/{repo}/teams', {
      owner,
      repo,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    const teams = response.data;

    // Fetch role_name for each team
    const teamsWithRoles = await Promise.all(teams.map(async (team) => {
      const role_name = await fetchTeamPermission(owner, team.slug, repo);
      return {
        name: team.name,
        role_name: role_name || 'No role assigned'
      };
    }));

    return teamsWithRoles;
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
  let markdown = `@${username}, please select the team for which you want access by editing this comment and checking the appropriate box. **Please select only one option:**\n\n`;

  
  if (teams.length > 0) {
    markdown += `### Teams associated with ${ownerFromCLI}/${repoFromCLI}:\n`;
    teams.forEach(team => {
      markdown += `- [ ] ${team.name} (${team.role_name})\n`;
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

// Function to add a user as a collaborator with write access to the repository
async function addCollaborator(owner, repo, username) {
  try {
    await octokit.request('PUT /repos/{owner}/{repo}/collaborators/{username}', {
      owner,
      repo,
      username,
      permission: 'write' // 'pull', 'push', or 'admin'
    });
    console.log(`User ${username} added as a collaborator to ${owner}/${repo} with write access.`);
  } catch (error) {
    console.error(`Error adding user ${username} as a collaborator to ${owner}/${repo}:`, error.message);
    if (error.response) {
      console.error(`Response status: ${error.response.status}`);
      console.error(`Response headers: ${JSON.stringify(error.response.headers)}`);
      console.error(`Response data: ${JSON.stringify(error.response.data)}`);
    }
  }
}

// Main function to handle fetching teams, adding user as collaborator, and posting the comment
async function handleFetchTeamsAndPostComment() {
  try {
    const teams = await fetchTeamsWithRoles(ownerFromCLI, repoFromCLI);
    const markdown = createMarkdownList(teams, username);

    // Add user as a collaborator with write access
    await addCollaborator(hardcodedOwner, hardcodedRepo, username);

    await postComment(hardcodedOwner, hardcodedRepo, issueNumber, markdown);
  } catch (error) {
    console.error('Error handling fetch teams and post comment:', error.message);
  }
}

// Run the script
handleFetchTeamsAndPostComment();
