import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { readApps } from "../lib/apps.mjs";
import {
  BASE_REF,
  git,
  MAX_TITLE_LENGTH,
  runtimeCatalogChanges,
} from "../lib/changesets.mjs";

const HEADING = /^\s*#{1,6}\s/m;
const RULE = "rule ops/changesets";

/** @type {string[]} */
const diagnostics = [];

/**
 * @param {string} file
 * @param {string} rule
 * @param {string} message
 * @param {string} help
 */
function report(file, rule, message, help) {
  diagnostics.push(
    `${file}:1:1: error changesets(${rule}): ${message} help: ${help}`,
  );
}

/**
 * @returns {{
 *       changesets: {
 *         id: string;
 *         summary: string;
 *         releases: { name: string; type: string }[];
 *       }[];
 *     }
 *   | undefined}
 */
function readReleasePlan() {
  const dir = mkdtempSync(path.join(tmpdir(), "release-check-"));
  const output = path.join(dir, "status.json");
  try {
    const status = spawnSync(
      "changeset",
      ["status", `--since=${BASE_REF}`, `--output=${output}`],
      { stdio: "inherit" },
    );
    if (status.error) {
      throw status.error;
    }
    return status.status === 0
      ? JSON.parse(readFileSync(output, "utf8"))
      : undefined;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

if (
  spawnSync("git", ["rev-parse", "--verify", "--quiet", `${BASE_REF}^{commit}`])
    .status !== 0
) {
  console.error(
    `${BASE_REF} is missing. Run \`git fetch origin main\`, then retry.`,
  );
  process.exit(1);
}

for (const file of git([
  "ls-files",
  "--others",
  "--exclude-standard",
  "--",
  ".changeset/*.md",
])
  .split("\n")
  .filter(Boolean)) {
  console.warn(
    `${file}:1:1: warning changesets(untracked): not seen until staged, since the check diffs tracked files. help: git add ${file}`,
  );
}

const plan = readReleasePlan();
if (!plan) {
  process.exit(1);
}

const apps = new Set(readApps().map((app) => app.name));
const allowMajor = process.env.CHANGESET_ALLOW_MAJOR === "1";

for (const { id, summary, releases } of plan.changesets) {
  const file = `.changeset/${id}.md`;
  for (const { name, type } of releases) {
    if (!apps.has(name)) {
      report(
        file,
        "app-only",
        `"${name}" is not an app.`,
        `name the apps whose behavior changes; a package's entry never reaches the release notes (${RULE}).`,
      );
    }
    if (type === "major" && !allowMajor) {
      report(
        file,
        "major",
        `"${name}" is bumped major.`,
        `while the apps are 0.x a breaking change is minor with a **Breaking:** title; a deliberate major needs the release:major PR label, or CHANGESET_ALLOW_MAJOR=1 locally (${RULE}).`,
      );
    }
  }
  if (releases.length === 0) {
    continue;
  }
  const [title = ""] = summary.split("\n", 1);
  if (title.trim() === "" || title.length > MAX_TITLE_LENGTH) {
    report(
      file,
      "title",
      `the first line is ${title.length} characters.`,
      `one sentence of 1-${MAX_TITLE_LENGTH} characters naming the observable change; details go in the body (${RULE}).`,
    );
  }
  if (HEADING.test(summary)) {
    report(
      file,
      "heading",
      "the summary contains a Markdown heading.",
      `the body renders inside a changelog list item; use a **bold** lead-in instead (${RULE}).`,
    );
  }
}

if (
  plan.changesets.length === 0 &&
  process.env.CHANGESET_SKIP_RUNTIME_DEPENDENCIES === "1"
) {
  console.warn(
    `pnpm-workspace.yaml:1:1: warning changesets(runtime-dependency): not checked on a Dependabot PR without CHANGESET_BOT_TOKEN, so its runtime bumps ship without a release note. help: add a changeset by hand to record them (${RULE}).`,
  );
} else if (plan.changesets.length === 0) {
  const changes = await runtimeCatalogChanges(BASE_REF);
  if (changes.size > 0) {
    const affected = [...changes.keys()].join(",");
    const names = [
      ...new Set([...changes.values()].flat().map((bump) => bump.name)),
    ];
    report(
      "pnpm-workspace.yaml",
      "runtime-dependency",
      `the runtime dependency bump of ${names.join(", ")} ships in ${affected}, and no changeset covers it.`,
      `pnpm changeset --patch ${affected} -m 'Bump …', or --empty when nothing observable changes (${RULE}).`,
    );
  }
}

if (diagnostics.length > 0) {
  console.error(diagnostics.join("\n"));
  process.exit(1);
}
