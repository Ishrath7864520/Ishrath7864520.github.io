const { Octokit } = require('@octokit/rest');
const fs = require('fs').promises;

// Create an Octokit instance with your personal access token
const octokit = new Octokit({
    auth: process.env.TOKENSS_GITHUB, // Ensure TOKEN_GITHUB is set in your environment variables
});

async function fetchOrgAdmins(org) {
    const admins = [];
    for await (const response of octokit.paginate.iterator(octokit.orgs.listMembers, { org, role: 'admin' })) {
        admins.push(...response.data.map(user => user.login));
    }
    return admins;
}

async function fetchOrgRepos(org) {
    const repos = [];
    for await (const response of octokit.paginate.iterator(octokit.repos.listForOrg, { org })) {
        repos.push(...response.data.map(repo => ({ name: repo.name, admins: [] })));
    }
    return repos;
}

async function updateRepoAdmins(repos, orgAdmins, org) {
    for (const repo of repos) {
        const collaborators = await octokit.repos.listCollaborators({
            owner: org,
            repo: repo.name,
            affiliation: 'direct'
        });

        const repoAdmins = collaborators.data
            .filter(user => user.permissions.admin)
            .map(user => user.login);

        // If there are repository-level admins
        if (repoAdmins.length > 0) {
            // If repo admin is the same as org admin, keep the repo admin
            repo.admins = repoAdmins.filter(repoAdmin => !orgAdmins.includes(repoAdmin)).concat(
                repoAdmins.filter(repoAdmin => orgAdmins.includes(repoAdmin))
            );
        }
        // If there are no repository-level admins, don't change repo.admins
    }
}

async function addCollaboratorWithWriteAccess(repoOwner, RepoName, username) {
    try {
        await octokit.repos.addCollaborator({
            owner: repoOwner,
            repo: RepoName,
            username: username,
            permission: 'write'
        });
        console.log(`Added ${username} as a collaborator with write access to ${repoOwner}/${RepoName}`);
    } catch (error) {
        console.error('Error adding collaborator:', error.message);
    }
}

async function assignIssueToUsername(issueNumber, username, targetRepoOwner, targetRepoName) {
    try {
        const assignResponse = await octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/assignees', {
            owner: targetRepoOwner,
            repo: targetRepoName,
            issue_number: parseInt(issueNumber),
            assignees: [username],
            headers: {
                'X-GitHub-Api-Version': '2022-11-28'
            }
        });

        if (assignResponse.status === 201) {
            console.log(`Assigned issue #${issueNumber} to username: ${username} in ${targetRepoOwner}/${targetRepoName}`);

            console.log('Waiting for 10 seconds...');
            await new Promise(resolve => setTimeout(resolve, 10000));

            await octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/comments', {
                owner: targetRepoOwner,
                repo: targetRepoName,
                issue_number: parseInt(issueNumber),
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
        await octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/comments', {
            owner: targetRepoOwner,
            repo: targetRepoName,
            issue_number: parseInt(issueNumber),
            body: `@${cliUsername} Please check with the org-level admin for access. No repo admin is present, hence closing the issue.`
        });

        await octokit.request('PATCH /repos/{owner}/{repo}/issues/{issue_number}', {
            owner: targetRepoOwner,
            repo: targetRepoName,
            issue_number: parseInt(issueNumber),
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
    const issueNumber = process.argv[4];
    const cliUsername = process.argv[5];
    const targetRepoOwner = 'Ishrath7864520';
    const targetRepoName = 'Access-Auto';

    if (!sourceRepoName || !issueNumber || !cliUsername) {
        console.error('Usage: node script.js <source_repo_owner> <source_repo_name> <issue_number> <cli_username>');
        process.exit(1);
    }

    console.log(`Fetching organization admins for ${sourceRepoOwner}...`);
    const orgAdmins = await fetchOrgAdmins(sourceRepoOwner);

    console.log(`Fetching repositories for ${sourceRepoOwner}...`);
    const repos = await fetchOrgRepos(sourceRepoOwner);

    console.log(`Updating repository admins...`);
    await updateRepoAdmins(repos, orgAdmins, sourceRepoOwner);

    const repoData = repos.find(repo => repo.name === sourceRepoName);

    if (!repoData || !repoData.admins || repoData.admins.length === 0) {
        console.log(`No admin found for repository ${sourceRepoName}. Closing the issue.`);
        await closeIssueWithComment(issueNumber, targetRepoOwner, targetRepoName, cliUsername);
        console.log('Process completed successfully.');
        return;
    }

    const username = repoData.admins[0];

    console.log(`Adding write access to ${username} and assigning issue #${issueNumber}...`);
    await addCollaboratorWithWriteAccess(targetRepoOwner, targetRepoName, username);
    await assignIssueToUsername(issueNumber, username, targetRepoOwner, targetRepoName);

    console.log('Issue assigned successfully.');
}

main();
