const { Octokit } = require('@octokit/rest');

// Create Octokit instance with personal access token
const octokit = new Octokit({
  auth: process.env.TOKENSS_GITHUB,
});

async function fetchIssueDetails(owner, repo, issueNumber) {
  try {
    const issueResponse = await octokit.issues.get({
      owner: owner,
      repo: repo,
      issue_number: issueNumber,
    });

    const issueBody = issueResponse.data.body;

    // Extract details from the issue body and trim any leading/trailing whitespace
    const repoOwner = issueBody.match(/repoOwner: (.*)/)[1].trim();
    const repoName = issueBody.match(/repoName: (.*)/)[1].trim();
    const teamsId = issueBody.match(/teams_id: (.*)/)[1].trim();
    const userEmail = issueBody.match(/user_email: (.*)/)[1].trim();
    const githubUsername = issueBody.match(/user github_username: (.*)/)[1].trim();
    const accessType = issueBody.match(/Type of access: (.*)/)[1].trim();

    return {
      repoOwner,
      repoName,
      teamsId,
      userEmail,
      githubUsername,
      accessType,
    };
  } catch (error) {
    console.error(`Error fetching issue details: ${error.message}`);
  }
}
