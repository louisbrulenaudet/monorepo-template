import { readFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

import { readApps } from "../../../../.github/actions/lib/apps.mjs";

const FOREIGN_ORIGIN = "https://smoke-foreign-origin.invalid";

const { values } = parseArgs({
  options: {
    url: { type: "string", multiple: true, default: [] },
    traces: { type: "boolean", default: false },
  },
});

/** @type {Map<string, string>} */
const overrides = new Map(
  values.url.map((pair) => {
    const eq = pair.indexOf("=");
    if (eq < 1) {
      throw new Error(`--url expects <app>=<base-url>, got "${pair}"`);
    }
    return [pair.slice(0, eq), pair.slice(eq + 1).replace(/\/+$/, "")];
  }),
);

/**
 * @param {unknown} value
 * @param {string} key
 * @returns {unknown}
 */
function prop(value, key) {
  return typeof value === "object" && value !== null
    ? Reflect.get(value, key)
    : undefined;
}

/**
 * @param {string} text
 * @returns {unknown}
 */
function parseJson(text) {
  try {
    return /** @type {unknown} */ (JSON.parse(text));
  } catch {
    return undefined;
  }
}

/**
 * @param {string} dir
 * @returns {unknown}
 */
function devPort(dir) {
  const manifest = parseJson(
    readFileSync(path.join("apps", dir, "package.json"), "utf8"),
  );
  return prop(prop(manifest, "monorepo"), "devPort");
}

const apps = readApps();
for (const name of overrides.keys()) {
  if (!apps.some((app) => app.name === name)) {
    throw new Error(`--url names an unknown app "${name}"`);
  }
}

/** @typedef {{ name: string; role: string; healthPath: string; base: string }} Target */

// With any --url, only the named apps are probed (a Preview run); otherwise
// every app with a devPort is probed on localhost.
/** @type {Target[]} */
const targets = apps.flatMap((app) => {
  if (app.healthPath === null) {
    return [];
  }
  const { name, role, healthPath } = app;
  if (overrides.size > 0) {
    const base = overrides.get(name);
    return base ? [{ name, role, healthPath, base }] : [];
  }
  const port = devPort(app.dir);
  return typeof port === "number"
    ? [{ name, role, healthPath, base: `http://localhost:${port}` }]
    : [];
});
if (targets.length === 0) {
  throw new Error("No app to probe: pass --url <app>=<base-url>");
}

/** @type {Record<string, string>} */
const accessHeaders =
  process.env.CF_ACCESS_CLIENT_ID && process.env.CF_ACCESS_CLIENT_SECRET
    ? {
        "CF-Access-Client-Id": process.env.CF_ACCESS_CLIENT_ID,
        "CF-Access-Client-Secret": process.env.CF_ACCESS_CLIENT_SECRET,
      }
    : {};

/**
 * @typedef {{ status: number; headers: Headers; body: string; ms: number }} Reply
 *
 * @typedef {Reply | { error: string }} Outcome
 *
 * @typedef {{ label: string; ok: boolean; detail: string }} Check
 */

/**
 * @param {string} url
 * @param {{
 *   method?: string;
 *   headers?: Record<string, string>;
 *   body?: string;
 * }} [init]
 * @returns {Promise<Outcome>}
 */
async function probe(url, init = {}) {
  const started = performance.now();
  try {
    const res = await fetch(url, {
      method: init.method,
      body: init.body,
      headers: { ...accessHeaders, ...init.headers },
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
    });
    const body = await res.text();
    const ms = Math.round(performance.now() - started);
    return { status: res.status, headers: res.headers, body, ms };
  } catch (error) {
    const cause = error instanceof Error ? error.cause : undefined;
    const code = prop(cause, "code");
    return { error: typeof code === "string" ? code : String(error) };
  }
}

/** @param {Outcome} outcome */
function describe(outcome) {
  if ("error" in outcome) {
    return `request failed: ${outcome.error}`;
  }
  const body = outcome.body.replace(/\s+/g, " ").slice(0, 120);
  return `${outcome.status} in ${outcome.ms}ms ${body}`;
}

/**
 * @param {Outcome} outcome
 * @param {string} name
 */
function header(outcome, name) {
  return "error" in outcome ? null : outcome.headers.get(name);
}

/**
 * @param {Target} t
 * @param {Target | undefined} frontend
 * @returns {Promise<Check[]>}
 */
async function checkGateway(t, frontend) {
  /** @param {string} origin */
  const preflight = (origin) =>
    probe(t.base + t.healthPath, {
      method: "OPTIONS",
      headers: { origin, "access-control-request-method": "GET" },
    });
  const allowedOrigin = frontend ? new URL(frontend.base).origin : undefined;
  const [health, missing, allowed, foreign] = await Promise.all([
    probe(t.base + t.healthPath),
    probe(`${t.base}/__smoke-not-found__`),
    allowedOrigin ? preflight(allowedOrigin) : undefined,
    preflight(FOREIGN_ORIGIN),
  ]);

  const healthJson = "body" in health ? parseJson(health.body) : undefined;
  const missingJson = "body" in missing ? parseJson(missing.body) : undefined;
  const foreignHeader = header(foreign, "access-control-allow-origin");
  const checks = [
    {
      label: `GET ${t.healthPath} returns { status, version }`,
      ok:
        "status" in health &&
        health.status === 200 &&
        typeof prop(healthJson, "status") === "string" &&
        typeof prop(healthJson, "version") === "string",
      detail: describe(health),
    },
    {
      label: "sets X-Request-Id",
      ok: Boolean(header(health, "x-request-id")),
      detail: header(health, "x-request-id") ?? "missing",
    },
    {
      label: "unknown path returns the JSON 404 envelope",
      ok:
        "status" in missing &&
        missing.status === 404 &&
        typeof prop(missingJson, "error") === "string",
      detail: describe(missing),
    },
    {
      label: "CORS refuses a foreign origin",
      ok:
        !("error" in foreign) &&
        foreignHeader !== FOREIGN_ORIGIN &&
        foreignHeader !== "*",
      detail: `allow-origin=${foreignHeader}`,
    },
  ];
  if (allowed && allowedOrigin) {
    const allowedHeader = header(allowed, "access-control-allow-origin");
    checks.push({
      label: `CORS allows ${allowedOrigin}`,
      ok: allowedHeader === allowedOrigin,
      detail: `allow-origin=${allowedHeader}`,
    });
  }
  return checks;
}

/**
 * @param {Target} t
 * @returns {Promise<Check[]>}
 */
async function checkFrontend(t) {
  const routes = [t.healthPath, "/__smoke-deep-link__"];
  const pages = await Promise.all(routes.map((route) => probe(t.base + route)));
  return pages.map((page, i) => ({
    label: `GET ${routes[i]} serves the SPA shell`,
    ok:
      "status" in page &&
      page.status === 200 &&
      page.body.includes('id="root"'),
    detail: "error" in page ? page.error : `${page.status} in ${page.ms}ms`,
  }));
}

/**
 * @param {Target} t
 * @returns {Promise<Check[]>}
 */
async function checkOther(t) {
  const health = await probe(t.base + t.healthPath);
  return [
    {
      label: `GET ${t.healthPath}`,
      ok: "status" in health && health.status === 200,
      detail: describe(health),
    },
  ];
}

const frontend = targets.find((t) => t.role === "frontend");
const results = await Promise.all(
  targets.map((t) => {
    if (t.role === "http-gateway") {
      return checkGateway(t, frontend);
    }
    return t.role === "frontend" ? checkFrontend(t) : checkOther(t);
  }),
);

let failures = 0;
for (const [i, t] of targets.entries()) {
  console.log(`# ${t.name} (${t.role}) ${t.base}`);
  for (const c of results[i] ?? []) {
    console.log(`${c.ok ? "ok  " : "FAIL"} ${c.label} - ${c.detail}`);
    failures += c.ok ? 0 : 1;
  }
}

const gateway = targets.find((t) => t.role === "http-gateway");
if (values.traces && gateway && overrides.size === 0) {
  const query = await probe(
    `${gateway.base}/cdn-cgi/local/explorer/api/local/observability/query`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      // Root span attributes are empty in local dev; the request line lives in
      // the span's first log entry, hence the join.
      body: JSON.stringify({
        sql:
          "SELECT s.outcome, s.duration_ms, s.error, l.message FROM spans s " +
          "LEFT JOIN logs l ON l.span_id = s.span_id AND l.seq = 0 " +
          "WHERE s.parent_id IS NULL AND l.message IS NOT NULL ORDER BY s.start_ms DESC LIMIT 10",
      }),
    },
  );
  const rows = prop(
    prop("body" in query ? parseJson(query.body) : undefined, "result"),
    "rows",
  );
  console.log("# latest requests (local Explorer, newest first)");
  if (Array.isArray(rows)) {
    for (const row of /** @type {unknown[]} */ (rows)) {
      const [outcome, ms, error, message] = Array.isArray(row)
        ? row.map(String)
        : [];
      const suffix = error && error !== "null" ? ` error=${error}` : "";
      console.log(`${outcome} ${ms}ms ${message}${suffix}`);
    }
  } else {
    console.log(describe(query));
  }
} else if (values.traces) {
  console.log(
    "# --traces reads the local Explorer only; for a Preview use the cloudflare-observability MCP server",
  );
}

console.log(
  `${failures === 0 ? "PASS" : "FAIL"}: ${failures} failing check(s)`,
);
process.exitCode = failures === 0 ? 0 : 1;
