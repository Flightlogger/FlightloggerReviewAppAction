const HEROKU_API = "https://api.heroku.com";

function headers(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    Accept: "application/vnd.heroku+json; version=3",
  };
}

export interface ReviewApp {
  id: string;
  pr_number: number;
  status: string;
  app?: { id: string };
}

export async function listReviewApps(apiKey: string, pipelineId: string): Promise<ReviewApp[]> {
  const res = await fetch(`${HEROKU_API}/pipelines/${pipelineId}/review-apps`, {
    headers: headers(apiKey),
  });
  if (!res.ok) throw new Error(`List review apps failed (${res.status}): ${await res.text()}`);
  return res.json();
}

export async function createReviewApp(
  apiKey: string,
  pipelineId: string,
  branch: string,
  prNumber: number,
  githubToken: string
): Promise<ReviewApp> {
  const tarballUrl = await resolveTarballUrl(githubToken, branch);
  const res = await fetch(`${HEROKU_API}/review-apps`, {
    method: "POST",
    headers: { ...headers(apiKey), "Content-Type": "application/json" },
    body: JSON.stringify({
      pipeline: pipelineId,
      branch,
      pr_number: prNumber,
      source_blob: {
        url: tarballUrl,
        version: process.env.GITHUB_SHA!,
      },
    }),
  });
  if (!res.ok) throw new Error(`Create review app failed (${res.status}): ${await res.text()}`);
  return res.json();
}

async function resolveTarballUrl(githubToken: string, branch: string): Promise<string> {
  const res = await fetch(
    `https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/tarball/${branch}`,
    {
      headers: { Authorization: `token ${githubToken}`, Accept: "application/json" },
      redirect: "manual",
    }
  );
  const location = res.headers.get("location");
  if (!location) throw new Error(`Failed to resolve tarball URL (${res.status})`);
  return location;
}

export async function deleteReviewApp(apiKey: string, reviewAppId: string): Promise<void> {
  const res = await fetch(`${HEROKU_API}/review-apps/${reviewAppId}`, {
    method: "DELETE",
    headers: headers(apiKey),
  });
  if (!res.ok) throw new Error(`Delete review app failed (${res.status}): ${await res.text()}`);
}
