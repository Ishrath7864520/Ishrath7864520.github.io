const { execSync } = require('child_process');
const fs = require('fs');
const { Octokit } = require("@octokit/rest");

const octokit = new Octokit({ auth: process.env.TOKENSS_GITHUB });

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

async function updateJsonFile(filePath, repos, orgAdmins, org) {
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

    fs.writeFileSync(filePath, JSON.stringify(repos, null, 2));
}


(async () => {
    try {
        const org = 'Ishrath7864520'; // Replace with your actual organization name
        const orgAdmins = await fetchOrgAdmins(org);
        const repos = await fetchOrgRepos(org);
        const filePath = `${process.env.GITHUB_WORKSPACE}/src/validation1.json`;
        await updateJsonFile(filePath, repos, orgAdmins, org); // Pass org as an argument

        // Git commands to commit and push changes
        execSync('git config --global user.email "actions@github.com"');
        execSync('git config --global user.name "GitHub Actions"');
        execSync('git add .');

        // Check if there are any changes to commit
        const status = execSync('git status --porcelain').toString();
        if (status !== '') {
            execSync('git commit -m "Update JSON file"');
            execSync(`git push https://${process.env.TOKENSS_GITHUB}@github.com/Ishrath7864520/Access-Auto.git testing`); // Replace 'main' with your branch name
            console.log('JSON file updated and changes pushed to repository successfully.');
        } else {
            console.log('No changes to commit.');
        }
    } catch (error) {
        console.error('Error updating JSON file:', error.message);
        process.exit(1); // Exit with an error code
    }
})();
