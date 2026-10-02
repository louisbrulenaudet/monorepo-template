import { spawnSync } from "node:child_process";

import { BASE_REF, checkChangesets, git } from "./lib.mjs";

/**
 * @param {"error" | "warning"} severity
 * @param {import("./lib.mjs").Diagnostic} diagnostic
 */
function format(severity, { file, rule, message, help }) {
  return `${file}:1:1: ${severity} changesets(${rule}): ${message} help: ${help}`;
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
    format("warning", {
      file,
      rule: "untracked",
      message: "not seen until staged, since the check diffs tracked files.",
      help: `git add ${file}`,
    }),
  );
}

const { plan, errors, warnings } = await checkChangesets();
if (!plan) {
  process.exit(1);
}
for (const warning of warnings) {
  console.warn(format("warning", warning));
}
if (errors.length > 0) {
  console.error(errors.map((error) => format("error", error)).join("\n"));
  process.exit(1);
}
