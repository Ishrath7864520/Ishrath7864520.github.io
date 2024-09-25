import { Octokit } from "@octokit/rest";

const octokit = new Octokit({ auth: process.env.TOKENSS_GITHUB });

const owner = 'Ishrath7864520'; // replace with the owner of the repository
const repo = 'Access-Auto';
const responseTimeLimit = 5; // Time limit in minutes

// Fetch collaborators for the given repository
async function fetchRepoCollaborators(repoName) {
  try {
    const { data } = await octokit.repos.listCollaborators({
      owner,
      repo: repoName,
      affiliation: 'direct'
    });
    return data.filter(user => user.permissions.admin).map(user => user.login);
  } catch (error) {
    console.error(`Error fetching collaborators for repo ${repoName}:`, error);
    return [];
  }
}

// Fetch organization members
async function fetchOrgMembers() {
  try {
    const { data } = await octokit.orgs.listMembers({
      org: owner
    });
    return data.map(member => member.login);
  } catch (error) {
    console.error(`Error fetching organization members:`, error);
    return [];
  }
}

octokit.issues.listForRepo({
  owner,
  repo,
  state: 'open'
}).then(({ data }) => {
  console.log(`Number of open issues: ${data.length}`);

  data.forEach(async issue => {
    console.log(`Issue number: ${issue.number}`);

    const match = issue.body.match(/repoName:\s*(\S+)/);
    if (match) {
      const repoName = match[1];
      console.log(`Repo name: ${repoName}`);

      const repoAdmins = await fetchRepoCollaborators(repoName);
      const orgMembers = await fetchOrgMembers();

      // Filter out organization-level admins from repo-level admins but retain those who are both
      const filteredRepoAdmins = repoAdmins.filter(admin => !orgMembers.includes(admin)).concat(
        repoAdmins.filter(admin => orgMembers.includes(admin))
      );

      if (filteredRepoAdmins.length > 0) {
        octokit.issues.listEvents({
          owner,
          repo,
          issue_number: issue.number
        }).then(({ data }) => {
          const assignEvents = data.filter(event => event.event === 'assigned');
          const assignedAdmins = assignEvents.map(event => event.assignee.login);

          console.log(`Assigned admins: ${assignedAdmins.join(', ')}`);

          const unassignedAdmins = filteredRepoAdmins.filter(admin => !assignedAdmins.includes(admin));
          console.log(`Unassigned admins: ${unassignedAdmins.join(', ')}`);

          if (unassignedAdmins.length > 0) {
            const latestAssignEvent = assignEvents[assignEvents.length - 1];
            const assignedTime = new Date(latestAssignEvent.created_at);
            const currentTime = new Date();
            const diffMinutes = (currentTime - assignedTime) / (1000 * 60);
            if (diffMinutes > responseTimeLimit) {
              const nextAdmin = unassignedAdmins[0];
              const currentAdmin = latestAssignEvent.assignee.login;

              // Revoke access of the current admin
              octokit.repos.removeCollaborator({
                owner,
                repo: repoName,
                username: currentAdmin
              }).then(() => {
                console.log(`Access revoked for admin ${currentAdmin} from repo ${repoName}.`);

                // Reassign the issue to the next admin
                octokit.issues.update({
                  owner,
                  repo,
                  issue_number: issue.number,
                  assignees: [nextAdmin]
                }).then(async () => {
                  console.log(`Issue #${issue.number} has been reassigned to ${nextAdmin}.`);
                  console.log('Waiting for 10 seconds...');
                  await new Promise(resolve => setTimeout(resolve, 10000));

                  // Give the reassigned admin write access to the repository
                  octokit.repos.addCollaborator({
                    owner,
                    repo,
                    username: nextAdmin,
                    permission: 'write' // 'push' permission allows the user to pull and push, but not administer this repository
                  }).then(() => {
                    console.log(`Admin ${nextAdmin} has been given write access to the repository.`);

                    // Add a markdown comment to the issue after reassigning
                    octokit.issues.createComment({
                      owner,
                      repo,
                      issue_number: issue.number,
                      body: `@${nextAdmin} Approve or Reject using markdown:\n- [ ] Approve\n- [ ] Reject`
                    }).then(() => {
                      console.log(`A comment has been added to issue #${issue.number} after reassigning.`);
                    }).catch(console.error);
                  }).catch(console.error);
                }).catch(console.error);
              }).catch(console.error);
            }
          } else {
            closeIssue(issue);
          }
        }).catch(console.error);
      } else {
        closeIssue(issue);
      }
    }
  });
}).catch(console.error);

function closeIssue(issue) {
  octokit.issues.createComment({
    owner,
    repo,
    issue_number: issue.number,
    body: `All admins are assigned and no one has responded for issue #${issue.number}, hence closing the issue.`
  }).then(() => {
    octokit.issues.update({
      owner,
      repo,
      issue_number: issue.number,
      state: 'closed'
    }).then(() => {
      console.log(`Issue #${issue.number} has been closed due to no response from the admins.`);
    }).catch(console.error);
  }).catch(console.error);
}
