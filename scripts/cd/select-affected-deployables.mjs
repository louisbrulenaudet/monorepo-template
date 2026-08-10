/**
 * Compute Stage 1 upload set from Turbo's affected build graph.
 *
 * Env: CD_AFFECTED_BASE / CD_AFFECTED_HEAD — required git SHAs
 * CD_EXPLICIT_WIDEN=both — force both deployables CD_WIDEN_REASON — required
 * when CD_EXPLICIT_WIDEN is set CD_SELECTION_OUT — optional path for JSON
 * selection output
 *
 * Exit 0 with selection JSON on stdout (and optional file). Fail closed on
 * unresolved range or silent narrowing after shared-package impact.
 */
import {
  DEPLOYABLES,
  SHARED_CONTRACT_PACKAGES,
  assertResolvableRange,
  fail,
  run,
  writeJson,
} from "./lib.mjs";

const base = process.env.CD_AFFECTED_BASE ?? "";
const head = process.env.CD_AFFECTED_HEAD ?? "";
assertResolvableRange(base, head);

const explicitWiden = process.env.CD_EXPLICIT_WIDEN === "both";
const widenReasonEnv = process.env.CD_WIDEN_REASON?.trim() ?? null;
if (explicitWiden && !widenReasonEnv) {
  fail("CD_EXPLICIT_WIDEN=both requires CD_WIDEN_REASON");
}

const filter = `...[${base}...${head}]`;
let dryRaw;
try {
  dryRaw = run("pnpm", [
    "exec",
    "turbo",
    "run",
    "build",
    `--filter=${filter}`,
    "--dry-run=json",
  ]);
} catch (error) {
  fail(
    `turbo dry-run failed for filter ${filter}: ${error.stderr ?? error.message}`,
  );
}

let dry;
try {
  dry = JSON.parse(dryRaw);
} catch {
  fail("turbo --dry-run=json did not return JSON; refuse to upload");
}

if (!Array.isArray(dry.packages)) {
  fail("turbo dry-run JSON missing packages[]; refuse to upload");
}

const packages = new Set(dry.packages.filter((name) => name && name !== "//"));
// Docs-only / no workspace package changes → empty upload set (not a failure).
// Unresolved SCM ranges are already rejected by assertResolvableRange.

const deployableNames = Object.keys(DEPLOYABLES);
const rebuildDeployables = deployableNames.filter((name) => packages.has(name));
const sharedTouched = SHARED_CONTRACT_PACKAGES.some((name) =>
  packages.has(name),
);

let selected = [...rebuildDeployables];
let widenReason = null;

if (explicitWiden) {
  selected = [...deployableNames];
  widenReason = widenReasonEnv;
} else if (sharedTouched) {
  // Shared wire packages ship inside consumers; default is coordinated uploads.
  const missing = deployableNames.filter((name) => !selected.includes(name));
  if (missing.length > 0) {
    selected = [...deployableNames];
    widenReason = "shared_contract_package_affected";
  }
}

selected = deployableNames.filter((name) => selected.includes(name));

const result = {
  commit_sha: head,
  affected_base: base,
  affected_head: head,
  affected_packages: [...packages].toSorted((a, b) => a.localeCompare(b)),
  selected_deployables: selected,
  widen_reason: widenReason,
  turbo_filter: filter,
};

const out = process.env.CD_SELECTION_OUT;
if (out) {
  writeJson(out, result);
}

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
