const { Octokit } = require('@octokit/rest');
const fs = require('fs').promises;

// Create an Octokit instance with your personal access token
const octokit = new Octokit({
    auth: process.env.TOKENSS_GITHUB, // Ensure TOKEN_GITHUB is set in your environment variables
});

async function addCollaboratorWithWriteAccess(repoOwner, repoName, username) {
    try {
        await octokit.repos.addCollaborator({
            owner: repoOwner,
            repo: repoName,
            username: username,
            permission: 'write'
        });
        console.log(`Added ${username} as a collaborator with write access to ${repoOwner}/${repoName}`);
    } catch (error) {
        console.error('Error adding collaborator:', error.message);
    }
}

async function assignIssueToUsername(issueNumber, username, targetRepoOwner, targetRepoName) {
    try {
        // Assign the issue to the username in the target repository
        const assignResponse = await octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/assignees', {
            owner: targetRepoOwner,
            repo: targetRepoName,
            issue_number: parseInt(issueNumber), // Parse issue number as integer
            assignees: [username], // Assign the issue to the username
            headers: {
                'X-GitHub-Api-Version': '2022-11-28'
            }
        });

        if (assignResponse.status === 201) {
            console.log(`Assigned issue #${issueNumber} to username: ${username} in ${targetRepoOwner}/${targetRepoName}`);

            // Add a delay of 10 seconds
            console.log('Waiting for 10 seconds...');
            await new Promise(resolve => setTimeout(resolve, 10000));

            // Add a comment to the issue with markdown (approve or reject)
            await octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/comments', {
                owner: targetRepoOwner,
                repo: targetRepoName,
                issue_number: parseInt(issueNumber), // Parse issue number as integer
                body: `@${username} Approve or Reject using markdown:\n- [ ] Approve\n- [ ] Reject`
            });

            console.log(`Added markdown comment to issue #${issueNumber} for username: ${username}.`);
        } else {
            console.log(`Failed to assign issue #${issueNumber} to username: ${username}.`);
        }
    } catch (error) {
        console.error('Error assigning issue to username:', error.message);
    }
}

async function closeIssueWithComment(issueNumber, targetRepoOwner, targetRepoName, cliUsername) {
    try {
        // Add a comment to the issue mentioning the user
        await octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/comments', {
            owner: targetRepoOwner,
            repo: targetRepoName,
            issue_number: parseInt(issueNumber), // Parse issue number as integer
            body: `@${cliUsername} Please check with the org-level admin for access. No repo admin is present, hence closing the issue.`
        });

        // Close the issue
        await octokit.request('PATCH /repos/{owner}/{repo}/issues/{issue_number}', {
            owner: targetRepoOwner,
            repo: targetRepoName,
            issue_number: parseInt(issueNumber), // Parse issue number as integer
            state: 'closed'
        });

        console.log(`Closed issue #${issueNumber} in ${targetRepoOwner}/${targetRepoName} with a comment mentioning @${cliUsername}.`);
    } catch (error) {
        console.error('Error closing issue:', error.message);
    }
}

async function main() {
    const sourceRepoOwner = process.argv[2];
    const sourceRepoName = process.argv[3];
    const issueNumber = process.argv[4]; // Issue number as command-line argument
    const cliUsername = process.argv[5]; // Username from command-line argument
    const targetRepoOwner = 'Ishrath7864520'; // Replace with your target repository owner
    const targetRepoName = 'Access-Auto'; // Replace with your target repository name

    if (!sourceRepoName || !issueNumber || !cliUsername) {
        console.error('Usage: node script.js <source_repo_owner> <source_repo_name> <issue_number> <cli_username>');
        process.exit(1);
    }

    console.log(`Fetching username for repository ${sourceRepoName}...`);
    const data = JSON.parse(await fs.readFile(`${process.env.GITHUB_WORKSPACE}/src/validation1.json`, 'utf8'));
    const repoData = data.find(repo => repo.name === sourceRepoName);

    if (!repoData || !repoData.admins || repoData.admins.length === 0) {
        console.log(`No admin found for repository ${sourceRepoName}. Closing the issue.`);
        await closeIssueWithComment(issueNumber, targetRepoOwner, targetRepoName, cliUsername);
        console.log('Process completed successfully.');
        return; // Exit the function gracefully
    }

    const username = repoData.admins[0]; // Assuming there's only one admin for simplicity

    console.log(`Adding write access to ${username} and assigning issue #${issueNumber}...`);
    await addCollaboratorWithWriteAccess(targetRepoOwner, targetRepoName, username);
    await assignIssueToUsername(issueNumber, username, targetRepoOwner, targetRepoName);

    console.log('Issue assigned successfully.');
}

main();
