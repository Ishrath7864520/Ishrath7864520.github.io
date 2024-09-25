const { Octokit } = require('@octokit/rest');

// Read command line arguments
const args = process.argv.slice(2);
const repoOwner = args[0];
const repoName = args[1];
const username = args[2];
const accessType = args[3];
const teamName = args[4];
const issueNumber = args[5]; // Assuming issue number is passed as the 6th argument
// Hardcoded repository details for posting a comment and closing the issue
const hardcodedOwner = 'Ishrath7864520';
const hardcodedRepoName = 'Access-Auto';
// Create Octokit instance with personal access token
const octokit = new Octokit({
  auth: process.env.TOKENSS_GITHUB,
});

// Function to get the team slug from the team name
async function getTeamSlug(org, teamName) {
  try {
    const teamsResponse = await octokit.teams.list({
      org: org,
      per_page: 100, // Increase if you have more teams
    });

    const team = teamsResponse.data.find((team) => team.name === teamName);
    const teamSlug = team ? team.slug : null;
    console.log(`Team ${teamName} slug: ${teamSlug}`);
    return teamSlug;
  } catch (error) {
    console.error(`Error getting team slug: ${error.message}`);
    throw error;
  }
}

// Function to check if a user is a member of a team
async function isUserInTeam(org, teamSlug, username) {
  try {
    const response = await octokit.teams.getMembershipForUserInOrg({
      org: org,
      team_slug: teamSlug,
      username: username,
    });

    console.log(`User ${username} is a member of team ${teamSlug}: ${response.status === 200}`);
    return response.status === 200;
  } catch (error) {
    if (error.status === 404) {
      console.log(`User ${username} is not a member of team ${teamSlug}`);
      return false;
    }
    console.error(`Error checking team membership: ${error.message}`);
    throw error;
  }
}

// Function to check if the user already has the requested access to the repository
async function checkUserAccess(owner, repo, username, accessType) {
  try {
    const response = await octokit.repos.getCollaboratorPermissionLevel({
      owner: owner,
      repo: repo,
      username: username,
    });

    const permission = response.data.permission;
    console.log(`User ${username} has ${permission} access to the repository ${owner}/${repo}`);
    return permission === accessType;
  } catch (error) {
    console.error(`Error checking user access: ${error.message}`);
    return false;
  }
}

// Function to post a comment on an issue
async function postComment(issueNumber, body) {
  try {
    await octokit.issues.createComment({
      owner: hardcodedOwner,
      repo: hardcodedRepoName,
      issue_number: issueNumber,
      body: body,
    });
    console.log('Comment posted successfully.');
  } catch (error) {
    console.error(`Error posting comment on issue ${issueNumber}: ${error.message}`);
    console.error(`Response data: ${JSON.stringify(error.response.data)}`);
    throw error;
  }
}

// Function to close an issue
async function closeIssue(issueNumber) {
  try {
    await octokit.issues.update({
      owner: hardcodedOwner,
      repo: hardcodedRepoName,
      issue_number: issueNumber,
      state: 'closed',
    });
    console.log('Issue closed successfully.');
  } catch (error) {
    console.error(`Error closing issue ${issueNumber}: ${error.message}`);
    console.error(`Response data: ${JSON.stringify(error.response.data)}`);
    throw error;
  }
}

// Main function to check access and handle issue
async function checkAccessAndHandleIssue(repoOwner, repoName, username, accessType, teamName, issueNumber) {
  try {
    const teamSlug = await getTeamSlug(repoOwner, teamName);
    let userHasAccess = false;
    let commentBody = '';

    if (teamSlug) {
      userHasAccess = await isUserInTeam(repoOwner, teamSlug, username);
      if (userHasAccess) {
        commentBody = `@${username}, you already have access to the team ${teamName}. Hence, closing the ticket.`;
      }
    } else {
      userHasAccess = await checkUserAccess(repoOwner, repoName, username, accessType);
      if (userHasAccess) {
        commentBody = `@${username}, you already have ${accessType} access to the repository ${repoName}. Hence, closing the ticket.`;
      }
    }

    if (userHasAccess) {
      await postComment(issueNumber, commentBody);
      await closeIssue(issueNumber);
      process.exit(0); // Exit code 0 for success
    } else {
      console.log(`User does not have the requested access. Leaving the issue open.`);
      process.exit(1); // Exit code 1 for failure
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1); // Exit code 1 for failure
  }
}

// Run the script
checkAccessAndHandleIssue(repoOwner, repoName, username, accessType, teamName, issueNumber);
