import { Octokit } from "@octokit/rest";
import fs from 'fs';
import path from 'path';

const octokit = new Octokit({ auth: process.env.TOKENSS_GITHUB });

const owner = 'Ishrath7864520'; // replace with the owner of the repository
const repo = 'Access-Auto';

// Read the JSON file
const jsonPath = path.join(process.env.GITHUB_WORKSPACE, 'src', 'validation1.json');
const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

octokit.issues.listForRepo({
  owner,
  repo,
  state: 'open'
}).then(({ data }) => {
  console.log(`Number of open issues: ${data.length}`);

  data.forEach(issue => {
    console.log(`Issue number: ${issue.number}`);

    const match = issue.body.match(/repoName:\s*(\S+)/);
    if (match) {
      const repoName = match[1];
      console.log(`Repo name: ${repoName}`);

      const repoData = jsonData.find(item => item.name === repoName);
      if (repoData && repoData.admins.length > 0) {
        octokit.issues.listEvents({
          owner,
          repo,
          issue_number: issue.number
        }).then(({ data }) => {
          const assignEvents = data.filter(event => event.event === 'assigned');
          const assignedAdmins = assignEvents.map(event => event.assignee.login);

          console.log(`Assigned admins: ${assignedAdmins.join(', ')}`);

          const unassignedAdmins = repoData.admins.filter(admin => !assignedAdmins.includes(admin));
          console.log(`Unassigned admins: ${unassignedAdmins.join(', ')}`);

          if (unassignedAdmins.length > 0) {
            const latestAssignEvent = assignEvents[assignEvents.length - 1];
            const assignedTime = new Date(latestAssignEvent.created_at);
            const currentTime = new Date();
            const diffMinutes = (currentTime - assignedTime) / (1000 * 60);
            if (diffMinutes > 5) {
              octokit.issues.update({
                owner,
                repo,
                issue_number: issue.number,
                assignees: [unassignedAdmins[0]]
              }).then(async () => {
                console.log(`Issue #${issue.number} has been reassigned to ${unassignedAdmins[0]}.`);
                console.log('Waiting for 10 seconds...');
                await new Promise(resolve => setTimeout(resolve, 10000));

                // Give the reassigned admin write access to the repository
                octokit.repos.addCollaborator({
                  owner,
                  repo,
                  username: unassignedAdmins[0],
                  permission: 'write' // 'push' permission allows the user to pull and push, but not administer this repository
                }).then(() => {
                  console.log(`Admin ${unassignedAdmins[0]} has been given write access to the repository.`);

                  // Add a markdown comment to the issue after reassigning
                  octokit.issues.createComment({
                    owner,
                    repo,
                    issue_number: issue.number,
                    body: `@${unassignedAdmins[0]} Approve or Reject using markdown:\n- [ ] Approve\n- [ ] Reject`
                  }).then(() => {
                    console.log(`A comment has been added to issue #${issue.number} after reassigning.`);
                  }).catch(console.error);
                }).catch(console.error);
              }).catch(console.error);
            }
          } else {
            logNoAdminMessage(issue, repoData);
          }
        }).catch(console.error);
      } else {
        logNoAdminMessage(issue, repoData);
      }
    }
  });
}).catch(console.error);

function logNoAdminMessage(issue, repoData) {
  if (!repoData || !repoData.admins || repoData.admins.length === 0) {
    console.log(`No repo level admin is present for issue #${issue.number}, please check with org level admin for access.`);
  } else {
    octokit.issues.listEvents({
      owner,
      repo,
      issue_number: issue.number
    }).then(({ data: events }) => {
      const assignEvents = events.filter(event => event.event === 'assigned');
      const latestAssignEvent = assignEvents[assignEvents.length - 1];
      const assignedTime = new Date(latestAssignEvent.created_at);
      const currentTime = new Date();
      const diffMinutes = (currentTime - assignedTime) / (1000 * 60);

      if (diffMinutes > 5) {
        console.log(`All admins are assigned and no one has responded for issue #${issue.number}, hence closing the issue.`);
      }
    }).catch(console.error);
  }
}
