const { Octokit } = require('@octokit/rest');

// Read command line arguments
const args = process.argv.slice(2);
const repoOwner = args[0];
const repoName = args[1];
const username = args[2];
let accessType = args[3];
const teamSlug = args[4];
const role = args[5] || 'member';

// Create Octokit instance with personal access token
const octokit = new Octokit({
  auth: process.env.TOKENSS_GITHUB,
});

// Function to check if a team exists in a repository
async function isTeamInRepo(owner, teamSlug) {
  try {
    const teamsResponse = await octokit.teams.list({
      org: owner,
      per_page: 100, // Increase if you have more teams
    });

    const teamExists = teamsResponse.data.some((team) => team.slug === teamSlug);
    return teamExists;
  } catch (error) {
    throw error; // Handle errors
  }
}

// Function to add or update team membership
async function addOrUpdateMembership(org, teamSlug, username, role) {
  try {
    await octokit.request('PUT /orgs/{org}/teams/{team_slug}/memberships/{username}', {
      org: org,
      team_slug: teamSlug,
      username: username,
      role: role,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    console.log(`User added to team ${teamSlug} successfully.`);
  } catch (error) {
    console.error(`Error adding user to team: ${error.message}`);
  }
}

// Main function to handle the process
async function grantAccess(repoOwner, repoName, username, accessType, teamSlug, role) {
  try {
    // Validate accessType
    const validAccessTypes = ['read', 'write', 'admin', 'maintain', 'triage'];

    if (!validAccessTypes.includes(accessType)) {
      console.log(`Invalid access type provided: ${accessType}. Setting access type to null.`);
      accessType = null;
    }

    const teamExists = await isTeamInRepo(repoOwner, teamSlug);

    if (teamExists) {
      // Team exists, add user to the team
      await addOrUpdateMembership(repoOwner, teamSlug, username, role.toLowerCase());
    } else {
      // Team does not exist, print a statement
      console.log(`Team with slug ${teamSlug} does not exist. Adding user directly to the repository.`);

      if (accessType) {
        // Grant access directly to the repository
        const collaborationResponse = await octokit.repos.addCollaborator({
          owner: repoOwner,
          repo: repoName,
          username: username,
          permission: accessType,
        });

        if (collaborationResponse.status === 201) {
          console.log(`Access granted directly to the repository ${repoOwner}/${repoName}.`);
        } else if (collaborationResponse.status === 204) {
          console.log(`User already has access to the repository ${repoOwner}/${repoName}.`);
        } else {
          console.error(`Failed to grant access. Status code: ${collaborationResponse.status}`);
          console.error(collaborationResponse.data);
        }
      } else {
        console.log('No valid access type provided. User not added to the repository.');
      }
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
  }
}

// Example usage
grantAccess(repoOwner, repoName, username, accessType, teamSlug, role);
