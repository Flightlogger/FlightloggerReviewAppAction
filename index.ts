import * as core from "@actions/core";
import { listReviewApps, createReviewApp, deleteReviewApp } from "./heroku";
import { deleteDnsRecords } from "./cloudflare";

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
      const cloudflareToken = core.getInput("cloudflare_api_token");
      const reviewDomain = core.getInput("review_domain");
      const prefixesInput = core.getInput("subdomain_prefixes");
      if (cloudflareToken && reviewDomain && prefixesInput) {
        const prefixes = prefixesInput.split(",").map((s) => s.trim());
        await deleteDnsRecords(cloudflareToken, reviewDomain, String(prNumber), prefixes);
      } else {
        console.log("Cloudflare inputs not provided — skipping DNS cleanup.");
      }
      const existing = await listReviewApps(herokuApiKey, pipelineId);
      const match = existing.find((ra) => ra.pr_number === prNumber);
      if (!match) {
        console.log(`No review app found for PR #${prNumber} — DNS cleaned up, no review app to destroy.`);
        return;
      }
      await deleteReviewApp(herokuApiKey, match.id);
      console.log(`DNS records and review app destroyed for PR #${prNumber}.`);
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
