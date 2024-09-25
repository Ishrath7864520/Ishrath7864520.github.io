const { Octokit } = require("@octokit/rest");

const octokit = new Octokit({ auth: process.env.TOKENSS_GITHUB });

async function run() {
  const [owner, repo, issue_number, comment_id, current_run_id] = process.argv.slice(2);

  console.log(`Owner: ${owner}`);
  console.log(`Repo: ${repo}`);
  console.log(`Issue Number: ${issue_number}`);
  console.log(`Comment ID: ${comment_id}`);
  console.log(`Current Run ID: ${current_run_id}`);

  try {
    // Fetch the workflow runs for the repository
    const { data: workflowRuns } = await octokit.actions.listWorkflowRunsForRepo({
      owner,
      repo,
      per_page: 100,
    });

    // Check if there is an existing workflow run for the same comment ID
    let duplicateRunId = null;
    for (const run of workflowRuns.workflow_runs) {
      if (run.id !== parseInt(current_run_id) && run.head_commit.message.includes(`comment_id: ${comment_id}`)) {
        duplicateRunId = run.id;
        break;
      }
    }

    if (duplicateRunId) {
      console.log(`Found duplicate workflow run with ID: ${duplicateRunId}. Cancelling it...`);
      await octokit.actions.cancelWorkflowRun({
        owner,
        repo,
        run_id: duplicateRunId,
      });
      console.log("::set-output name=cancel_workflow::true");
    } else {
      console.log("::set-output name=cancel_workflow::false");
    }
  } catch (error) {
    console.error(`Error processing comment IDs: ${error.message}`);
    process.exit(1);
  }
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
