/**
 * Write a Stage 1 release / upload record matching docs evidence §12 / §15.
 *
 * Usage:
 * node scripts/cd/write-release-record.mjs --in selection.json --out release.json\
 * --worker worker-api --version-id <id> --previous-deployment <id>\
 * [--spa-api-origin <url>] [--smoke-method skipped_with_reason]
 */
import { parseArgs } from "node:util";
import { DEPLOYABLES, fail, readJson, writeJson } from "./lib.mjs";

const { values } = parseArgs({
  options: {
    in: { type: "string" },
    out: { type: "string" },
    worker: { type: "string", multiple: true },
    "version-id": { type: "string", multiple: true },
    "previous-deployment": { type: "string", multiple: true },
    "spa-api-origin": { type: "string" },
    "smoke-method": { type: "string", default: "skipped_with_reason" },
    decision: { type: "string", default: "leave_inactive" },
  },
});

if (!values.in || !values.out) {
  fail("--in and --out are required");
}

const selection = readJson(values.in);
const workersArg = values.worker ?? [];
const versionIds = values["version-id"] ?? [];
const previousDeployments = values["previous-deployment"] ?? [];

if (workersArg.length === 0) {
  fail("at least one --worker is required");
}
if (
  workersArg.length !== versionIds.length ||
  workersArg.length !== previousDeployments.length
) {
  fail(
    "--worker, --version-id, and --previous-deployment must be provided in equal counts",
  );
}

const spaOrigin = values["spa-api-origin"] ?? null;
const smokeMethod = values["smoke-method"];
const decision = values.decision;

const workers = workersArg.map((packageName, index) => {
  const meta = DEPLOYABLES[packageName];
  if (!meta) {
    fail(`unknown deployable ${packageName}`);
  }
  return {
    package_name: packageName,
    actual_worker_name: meta.actualWorkerName,
    version_id: versionIds[index],
    previous_active_deployment: previousDeployments[index],
    spa_api_origin: meta.spaApiOrigin ? spaOrigin : null,
    smoke_method: smokeMethod,
    served_version_verified: false,
    decision,
  };
});

const record = {
  commit_sha: selection.commit_sha,
  affected_base: selection.affected_base,
  affected_head: selection.affected_head,
  affected_packages: selection.affected_packages,
  selected_deployables: selection.selected_deployables,
  widen_reason: selection.widen_reason,
  build_inputs: {
    vite_api_base_url: spaOrigin,
  },
  workers,
};

writeJson(values.out, record);
process.stdout.write(`${JSON.stringify(record, null, 2)}\n`);
