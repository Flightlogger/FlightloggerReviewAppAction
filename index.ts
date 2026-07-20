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
      await handleCreate(herokuApiKey, pipelineId, prNumber);
    } else if (command === "destroy") {
      await handleDestroy(herokuApiKey, pipelineId, prNumber);
    } else {
      core.setFailed(`Unknown command: ${command}. Use 'create' or 'destroy'.`);
    }
  } catch (error: any) {
    core.setFailed(error.message);
  }
}

async function handleCreate(apiKey: string, pipelineId: string, prNumber: number) {
  const prBranch = core.getInput("pr_branch", { required: true });
  const existing = await listReviewApps(apiKey, pipelineId);
  const match = existing.find((ra) => ra.pr_number === prNumber);
  if (match) {
    console.log(`Deleting existing review app ${match.id}...`);
    await deleteReviewApp(apiKey, match.id);
    await sleep(15_000);
  }
  const response = await createReviewApp(apiKey, pipelineId, prBranch, prNumber);
  console.log(`Review app created (${response.status}). Heroku will build, deploy, and run postdeploy.`);
}

async function handleDestroy(apiKey: string, pipelineId: string, prNumber: number) {
  const cloudflareToken = core.getInput("cloudflare_api_token", { required: true });
  const reviewDomain = core.getInput("review_domain");
  const prefixes = core.getInput("subdomain_prefixes").split(",").map((s) => s.trim());
  const existing = await listReviewApps(apiKey, pipelineId);
  const match = existing.find((ra) => ra.pr_number === prNumber);
  if (!match) {
    console.log(`No review app found for PR #${prNumber} — nothing to destroy.`);
    return;
  }
  await deleteDnsRecords(cloudflareToken, reviewDomain, String(prNumber), prefixes);
  await deleteReviewApp(apiKey, match.id);
  console.log(`Review app destroyed and DNS cleaned up for PR #${prNumber}.`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

run();
