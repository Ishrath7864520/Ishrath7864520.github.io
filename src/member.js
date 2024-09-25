const { Octokit } = require('@octokit/rest');

// Create Octokit instance with personal access token
const octokit = new Octokit({
  auth: process.env.TOKENSS_GITHUB,
});

async function checkMembership(org, username) {
  try {
    await octokit.orgs.checkMembershipForUser({
      org: org,
      username: username,
    });

    console.log(`User ${username} is a member of organization ${org}`);
  } catch (error) {
    if (error.status === 404) {
      console.log(`User ${username} is not a member of organization ${org}`);
    } else {
      console.error(`Error checking membership: ${error.message}`);
    }
  }
}

// Get the org and username from the command line
const org = process.argv[2];
const username = process.argv[3];

if (!org || !username) {
  console.error('Usage: node script.js <org> <username>');
  process.exit(1);
}

// Call the function with the provided org and username
checkMembership(org, username);
