/**
 * Smoke worker-api: GET /api/v1/health and verify served version when expected.
 *
 * Env: SMOKE_BASE_URL — required, e.g.
 * https://worker-api-production.<subdomain>.workers.dev
 * SMOKE_EXPECTED_VERSION_ID — optional; when set, require X-Worker-Version-Id
 * match SMOKE_OVERRIDE_VERSION_ID — optional; send
 * Cloudflare-Workers-Version-Overrides SMOKE_WORKER_NAME — override header key
 * (default worker-api-production)
 */
const baseUrl = process.env.SMOKE_BASE_URL?.replace(/\/$/, "");
if (!baseUrl) {
  console.error("ERROR: SMOKE_BASE_URL is required");
  process.exit(1);
}

const expected = process.env.SMOKE_EXPECTED_VERSION_ID?.trim() ?? null;
const overrideVersion = process.env.SMOKE_OVERRIDE_VERSION_ID?.trim() ?? null;
const workerName =
  process.env.SMOKE_WORKER_NAME?.trim() ?? "worker-api-production";

const headers = {
  Accept: "application/json",
};
if (overrideVersion) {
  headers["Cloudflare-Workers-Version-Overrides"] =
    workerName + '="' + overrideVersion + '"';
}

const url = baseUrl + "/api/v1/health";
const response = await fetch(url, { headers });
const bodyText = await response.text();

if (!response.ok) {
  console.error("ERROR: health status " + response.status);
  process.exit(1);
}

let body;
try {
  body = JSON.parse(bodyText);
} catch {
  console.error("ERROR: health response is not JSON");
  process.exit(1);
}

if (body?.status !== "ok") {
  console.error("ERROR: unexpected health body");
  process.exit(1);
}

const served = response.headers.get("x-worker-version-id");
if (expected) {
  if (!served) {
    console.error(
      "ERROR: expected X-Worker-Version-Id but header was missing; abort",
    );
    process.exit(1);
  }
  if (served !== expected) {
    console.error(
      "ERROR: served version " +
        served +
        " !== expected " +
        expected +
        "; abort",
    );
    process.exit(1);
  }
}

console.log(
  JSON.stringify(
    {
      ok: true,
      url,
      served_version_id: served,
      served_version_verified: Boolean(expected && served === expected),
    },
    null,
    2,
  ),
);
