import { readFileSync } from "node:fs";
import path from "node:path";
import { setTimeout } from "node:timers/promises";
import { parseArgs } from "node:util";

import { readApps } from "./apps.mjs";

const FOREIGN_ORIGIN = "https://smoke-foreign-origin.invalid";
const READY_ATTEMPTS = 6;
const READY_DELAY_MS = 5000;

const { values } = parseArgs({
  options: {
    url: { type: "string", multiple: true, default: [] },
    "expect-version": { type: "string" },
    traces: { type: "boolean", default: false },
  },
});
const expectedVersion = values["expect-version"];
const annotate = process.env.GITHUB_ACTIONS === "true";

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

/** @param {string} key An app name, or a `monorepo.role` exactly one app has */
function resolveApp(key) {
  const named = apps.find((app) => app.name === key);
  if (named) {
    return named;
  }
  const byRole = apps.filter((app) => app.role === key);
  if (byRole.length !== 1) {
    throw new Error(
      `--url key "${key}" is neither an app name nor the monorepo.role of exactly one app`,
    );
  }
  return byRole[0];
}

/** @type {Map<string, string>} App name → base URL */
const overrides = new Map(
  values.url.map((pair) => {
    const eq = pair.indexOf("=");
    const base = pair.slice(eq + 1).replace(/\/+$/, "");
    if (eq < 1 || !URL.canParse(base)) {
      throw new Error(`--url expects <app or role>=<base-url>, got "${pair}"`);
    }
    return [resolveApp(pair.slice(0, eq)).name, base];
  }),
);

/**
 * @typedef {{
 *   name: string;
 *   dir: string;
 *   role: string;
 *   healthPath: string;
 *   base: string;
 * }} Target
 */

/** @type {Target[]} */
const targets = apps.flatMap((app) => {
  if (app.healthPath === null) {
    return [];
  }
  const { name, dir, role, healthPath } = app;
  if (overrides.size > 0) {
    const base = overrides.get(name);
    return base ? [{ name, dir, role, healthPath, base }] : [];
  }
  const port = devPort(dir);
  return typeof port === "number"
    ? [{ name, dir, role, healthPath, base: `http://localhost:${port}` }]
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
 * @typedef {{ label: string; ok: boolean; detail: string; hint?: string }} Check
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
 * @param {Outcome} outcome
 * @returns {string | undefined}
 */
function hint(t, outcome) {
  if ("error" in outcome) {
    return undefined;
  }
  if (outcome.status === 302 || outcome.status === 403) {
    return "Cloudflare Access is blocking the probe: set CF_ACCESS_CLIENT_ID / CF_ACCESS_CLIENT_SECRET to an Access service token.";
  }
  if (t.role === "http-gateway" && outcome.status === 503) {
    return `A gateway 503 is the fail-closed CORS guard: set this deployment's corsOrigins in apps/${t.dir}/cloudflare.config.ts.`;
  }
  return undefined;
}

/**
 * @param {Target} t
 * @param {Outcome} health
 */
function serving(t, health) {
  if (
    "error" in health ||
    health.status === 404 ||
    (health.status >= 520 && health.status <= 529)
  ) {
    return false;
  }
  return (
    t.role !== "http-gateway" ||
    expectedVersion === undefined ||
    prop(parseJson(health.body), "version") === expectedVersion
  );
}

/**
 * @param {Target} t
 * @param {number} [attempts]
 * @returns {Promise<void>}
 */
async function ready(t, attempts = READY_ATTEMPTS - 1) {
  if (attempts === 0 || serving(t, await probe(t.base + t.healthPath))) {
    return;
  }
  await setTimeout(READY_DELAY_MS);
  await ready(t, attempts - 1);
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
  /** @type {Check[]} */
  const checks = [
    {
      label: `GET ${t.healthPath} returns { status, version }`,
      ok:
        "status" in health &&
        health.status === 200 &&
        typeof prop(healthJson, "status") === "string" &&
        typeof prop(healthJson, "version") === "string",
      detail: describe(health),
      hint: hint(t, health),
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
  if (expectedVersion !== undefined) {
    const version = prop(healthJson, "version");
    checks.push({
      label: `serves version ${expectedVersion}`,
      ok: version === expectedVersion,
      detail: `version=${String(version)}`,
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
    hint: hint(t, page),
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
      hint: hint(t, health),
    },
  ];
}

if (overrides.size > 0) {
  await Promise.all(targets.map((t) => ready(t)));
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
    if (c.ok) {
      continue;
    }
    failures += 1;
    if (c.hint) {
      console.log(`     ${c.hint}`);
    }
    if (annotate) {
      const message = [c.label, "-", c.detail, c.hint ?? ""].join(" ").trim();
      console.log(
        `::error title=Smoke ${t.name}::${message.replaceAll("%", "%25")}`,
      );
    }
  }
}
if (overrides.size > 0) {
  for (const app of apps) {
    if (app.healthPath !== null && !overrides.has(app.name)) {
      console.log(
        `${annotate ? "::notice::" : "# "}${app.name} not smoked: no --url for it`,
      );
    }
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
