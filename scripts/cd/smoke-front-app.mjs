/**
 * Smoke front-app: load index HTML and every referenced critical JS/CSS asset.
 *
 * Assets-only Workers cannot echo version metadata. When
 * SMOKE_EXPECTED_VERSION_ID is set, the operator must first confirm that
 * version is in the active deployment (see runbook). This script verifies
 * document + asset reachability only.
 *
 * Env: SMOKE_BASE_URL — required SMOKE_OVERRIDE_VERSION_ID — optional
 * Cloudflare-Workers-Version-Overrides value SMOKE_WORKER_NAME — default
 * front-app-production
 */
const baseUrl = process.env.SMOKE_BASE_URL?.replace(/\/$/, "");
if (!baseUrl) {
  console.error("ERROR: SMOKE_BASE_URL is required");
  process.exit(1);
}

const overrideVersion = process.env.SMOKE_OVERRIDE_VERSION_ID?.trim() ?? null;
const workerName =
  process.env.SMOKE_WORKER_NAME?.trim() ?? "front-app-production";

const headers = {};
if (overrideVersion) {
  headers["Cloudflare-Workers-Version-Overrides"] =
    workerName + '="' + overrideVersion + '"';
}

async function get(pathOrUrl) {
  const url = pathOrUrl.startsWith("http")
    ? pathOrUrl
    : baseUrl + (pathOrUrl.startsWith("/") ? pathOrUrl : "/" + pathOrUrl);
  const response = await fetch(url, { headers });
  const text = await response.text();
  return { url, response, text };
}

const index = await get("/");
if (!index.response.ok) {
  console.error("ERROR: index status " + index.response.status);
  process.exit(1);
}

const assetRefs = [];
const scriptRe = /<script[^>]+src=["']([^"']+)["']/gi;
const linkRe = /<link[^>]+href=["']([^"']+\.css)["']/gi;
let match;
while ((match = scriptRe.exec(index.text)) !== null) {
  assetRefs.push(match[1]);
}
while ((match = linkRe.exec(index.text)) !== null) {
  assetRefs.push(match[1]);
}

if (assetRefs.length === 0) {
  console.error("ERROR: no script/link assets found in index HTML");
  process.exit(1);
}

const assets = await Promise.all(assetRefs.map((ref) => get(ref)));
const failed = assets
  .filter((asset) => !asset.response.ok)
  .map((asset) => ({ url: asset.url, status: asset.response.status }));

if (failed.length > 0) {
  console.error("ERROR: asset smoke failures " + JSON.stringify(failed));
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      index_url: index.url,
      assets_checked: assetRefs.length,
      note: "SPA served_version_verified requires prior wrangler deployments list membership check",
    },
    null,
    2,
  ),
);
