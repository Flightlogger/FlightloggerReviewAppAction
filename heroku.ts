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
  prNumber: number
): Promise<ReviewApp> {
  const res = await fetch(`${HEROKU_API}/review-apps`, {
    method: "POST",
    headers: { ...headers(apiKey), "Content-Type": "application/json" },
    body: JSON.stringify({
      pipeline: pipelineId,
      branch,
      pr_number: prNumber,
    }),
  });
  if (!res.ok) throw new Error(`Create review app failed (${res.status}): ${await res.text()}`);
  return res.json();
}

export async function deleteReviewApp(apiKey: string, reviewAppId: string): Promise<void> {
  const res = await fetch(`${HEROKU_API}/review-apps/${reviewAppId}`, {
    method: "DELETE",
    headers: headers(apiKey),
  });
  if (!res.ok) throw new Error(`Delete review app failed (${res.status}): ${await res.text()}`);
}
