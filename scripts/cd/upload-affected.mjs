/**
 * Upload immutable Worker versions for the Stage 1 selection. Never creates a
 * deployment (no versions deploy / wrangler deploy).
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  DEPLOYABLES,
  ROOT,
  fail,
  findVersionUpload,
  parseWranglerNdjson,
  readJson,
  run,
  runInherit,
  writeJson,
} from "./lib.mjs";

const head = process.env.CD_AFFECTED_HEAD ?? "";
const selectionPath =
  process.env.CD_SELECTION_OUT ?? join(ROOT, "dist/cd/selection.json");
const releasePath =
  process.env.CD_RELEASE_OUT ?? join(ROOT, "dist/cd/release.json");

const select = spawnSync(
  process.execPath,
  [join(ROOT, "scripts/cd/select-affected-deployables.mjs")],
  {
    cwd: ROOT,
    encoding: "utf8",
    env: {
      ...process.env,
      CD_SELECTION_OUT: selectionPath,
    },
  },
);
if (select.status !== 0) {
  process.stderr.write(select.stderr || select.stdout || "");
  fail("affected selection failed");
}

const selection = readJson(selectionPath);
const selected = selection.selected_deployables ?? [];

if (selected.length === 0) {
  console.log(
    "No deployables selected for upload; writing empty release record.",
  );
  writeJson(releasePath, {
    ...selection,
    build_inputs: {
      vite_api_base_url: process.env.VITE_API_BASE_URL ?? null,
    },
    workers: [],
  });
  process.exit(0);
}

if (selected.includes("front-app")) {
  const spaOrigin = process.env.VITE_API_BASE_URL?.trim();
  if (!spaOrigin) {
    fail(
      "VITE_API_BASE_URL is required when front-app is selected for production upload",
    );
  }
}

const filterArgs = selected.flatMap((name) => ["--filter", name]);
runInherit("pnpm", ["exec", "turbo", "run", "build", ...filterArgs], {
  env: {
    ...process.env,
    NODE_ENV: "production",
    VITE_API_BASE_URL: process.env.VITE_API_BASE_URL,
  },
});

const tmp = mkdtempSync(join(tmpdir(), "cd-upload-"));
const workers = [];

try {
  for (const packageName of selected) {
    const meta = DEPLOYABLES[packageName];
    const outputPath = join(tmp, packageName + ".ndjson");

    let previousDeployment = "unknown";
    try {
      const raw = run("pnpm", [
        "--filter",
        packageName,
        "exec",
        "wrangler",
        "deployments",
        "list",
        "--env",
        "production",
        "--json",
      ]);
      const deployments = JSON.parse(raw);
      const first = Array.isArray(deployments) ? deployments[0] : null;
      if (first?.id) {
        previousDeployment = first.id;
      } else if (first?.DeploymentId) {
        previousDeployment = first.DeploymentId;
      }
    } catch (error) {
      fail(
        "could not read previous active deployment for " +
          packageName +
          ". Bootstrap first if the Worker was never published. " +
          String(error.stderr ?? error.message ?? error),
      );
    }

    const tag = head.slice(0, 12);
    const message = "stage1-upload " + head;
    runInherit(
      "pnpm",
      [
        "--filter",
        packageName,
        "exec",
        "wrangler",
        "versions",
        "upload",
        "--env",
        "production",
        "--tag",
        tag,
        "--message",
        message,
      ],
      {
        env: {
          ...process.env,
          WRANGLER_OUTPUT_FILE_PATH: outputPath,
          WRANGLER_SEND_METRICS: "false",
        },
      },
    );

    const upload = findVersionUpload(parseWranglerNdjson(outputPath));
    if (!upload?.version_id) {
      fail(
        "wrangler versions upload for " +
          packageName +
          " did not emit a version-upload record with version_id",
      );
    }

    workers.push({
      package_name: packageName,
      actual_worker_name: meta.actualWorkerName,
      version_id: upload.version_id,
      previous_active_deployment: previousDeployment,
      spa_api_origin: meta.spaApiOrigin
        ? (process.env.VITE_API_BASE_URL ?? null)
        : null,
      smoke_method: "skipped_with_reason",
      served_version_verified: false,
      decision: "leave_inactive",
    });
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

const record = {
  commit_sha: selection.commit_sha,
  affected_base: selection.affected_base,
  affected_head: selection.affected_head,
  affected_packages: selection.affected_packages,
  selected_deployables: selection.selected_deployables,
  widen_reason: selection.widen_reason,
  build_inputs: {
    vite_api_base_url: process.env.VITE_API_BASE_URL ?? null,
  },
  workers,
};

writeJson(releasePath, record);
process.stdout.write(JSON.stringify(record, null, 2) + "\n");
