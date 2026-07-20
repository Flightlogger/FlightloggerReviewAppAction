import * as core from "@actions/core";
import { listReviewApps, createReviewApp, deleteReviewApp } from "./heroku";

async function run() {
  try {
    const command = core.getInput("command", { required: true });
    const prNumber = parseInt(core.getInput("pr_number", { required: true }), 10);
    const herokuApiKey = core.getInput("heroku_api_key", { required: true });
    const pipelineId = core.getInput("heroku_pipeline_id", { required: true });

    if (command === "create") {
      const prBranch = core.getInput("pr_branch", { required: true });
      const githubToken = core.getInput("github_token", { required: true });
      const existing = await listReviewApps(herokuApiKey, pipelineId);
      const match = existing.find((ra) => ra.pr_number === prNumber);
      if (match) {
        console.log(`Deleting existing review app ${match.id}...`);
        await deleteReviewApp(herokuApiKey, match.id);
        await sleep(15_000);
      }
      const response = await createReviewApp(herokuApiKey, pipelineId, prBranch, prNumber, githubToken);
      console.log(`Review app created (${response.status}). Heroku will build, deploy, and run postdeploy.`);
    } else if (command === "destroy") {
      const existing = await listReviewApps(herokuApiKey, pipelineId);
      const match = existing.find((ra) => ra.pr_number === prNumber);
      if (!match) {
        console.log(`No review app found for PR #${prNumber} — nothing to destroy.`);
        return;
      }
      await deleteReviewApp(herokuApiKey, match.id);
      console.log(`Review app destroyed for PR #${prNumber}.`);
    } else {
      core.setFailed(`Unknown command: ${command}. Use 'create' or 'destroy'.`);
    }
  } catch (error: any) {
    core.setFailed(error.message);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

run();
