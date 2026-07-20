const CF_API = "https://api.cloudflare.com/client/v4";

interface DnsRecord {
  id: string;
  name: string;
  type: string;
}

export async function deleteDnsRecords(
  apiToken: string,
  domain: string,
  prNumber: string,
  prefixes: string[]
): Promise<void> {
  const zoneId = await findZoneId(apiToken, domain);
  if (!zoneId) throw new Error(`Cloudflare zone not found for ${domain}`);
  const pattern = new RegExp(
    `^(${prefixes.join("|")})-pr-${prNumber}(-.+)?\\.${escapeRegex(domain)}$`
  );
  const records = await listDnsRecords(apiToken, zoneId);
  for (const record of records) {
    if (pattern.test(record.name)) {
      console.log(`Deleting DNS record: ${record.name}`);
      await deleteRecord(apiToken, zoneId, record.id);
    }
  }
}

async function findZoneId(apiToken: string, domain: string): Promise<string | null> {
  const res = await fetch(`${CF_API}/zones?name=${domain}`, {
    headers: cfHeaders(apiToken),
  });
  if (!res.ok) throw new Error(`Cloudflare zones lookup failed (${res.status}): ${await res.text()}`);
  const data = await res.json() as { result: { id: string }[] };
  return data.result[0]?.id ?? null;
}

async function listDnsRecords(apiToken: string, zoneId: string): Promise<DnsRecord[]> {
  const records: DnsRecord[] = [];
  let page = 1;
  while (true) {
    const res = await fetch(`${CF_API}/zones/${zoneId}/dns_records?type=CNAME&per_page=100&page=${page}`, {
      headers: cfHeaders(apiToken),
    });
    if (!res.ok) throw new Error(`Cloudflare DNS list failed (${res.status}): ${await res.text()}`);
    const data = await res.json() as { result: DnsRecord[]; result_info: { total_pages: number } };
    records.push(...data.result);
    if (page >= data.result_info.total_pages) break;
    page++;
  }
  return records;
}

async function deleteRecord(apiToken: string, zoneId: string, recordId: string): Promise<void> {
  const res = await fetch(`${CF_API}/zones/${zoneId}/dns_records/${recordId}`, {
    method: "DELETE",
    headers: cfHeaders(apiToken),
  });
  if (!res.ok) throw new Error(`Cloudflare DNS delete failed (${res.status}): ${await res.text()}`);
}

function cfHeaders(apiToken: string) {
  return {
    Authorization: `Bearer ${apiToken}`,
    "Content-Type": "application/json",
  };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
