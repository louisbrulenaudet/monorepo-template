import { randomUUID } from "node:crypto";
import { appendFileSync } from "node:fs";

import { readApps } from "../lib/apps.mjs";
import { checkChangesets } from "./lib.mjs";

const BUMPS = ["none", "patch", "minor", "major"];

const {
  HEAD_SHA,
  GITHUB_SERVER_URL,
  GITHUB_REPOSITORY,
  GITHUB_RUN_ID,
  GITHUB_OUTPUT,
  GITHUB_STEP_SUMMARY,
} = process.env;
if (
  !HEAD_SHA ||
  !GITHUB_SERVER_URL ||
  !GITHUB_REPOSITORY ||
  !GITHUB_RUN_ID ||
  !GITHUB_OUTPUT ||
  !GITHUB_STEP_SUMMARY
) {
  throw new Error(
    "HEAD_SHA and the GitHub Actions run environment are required",
  );
}
const repoUrl = `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}`;
const runUrl = `${repoUrl}/actions/runs/${GITHUB_RUN_ID}`;
const guideUrl = `${repoUrl}/blob/${HEAD_SHA}/.changeset/README.md`;

/** @param {string} text */
function cell(text) {
  return text.replaceAll("|", String.raw`\|`);
}

/**
 * @param {string} file
 * @param {string} [label]
 */
function link(file, label = file) {
  return `[\`${label}\`](${repoUrl}/blob/${HEAD_SHA}/${file})`;
}

/** @param {{ type: string }[]} releases */
function highest(releases) {
  return BUMPS[Math.max(...releases.map(({ type }) => BUMPS.indexOf(type)))];
}

/** @param {import("./lib.mjs").Changeset} changeset */
function changesetRow({ id, summary, releases }) {
  const title = summary.split("\n", 1)[0].trim();
  const note = `${title === "" ? "_No summary_" : cell(title)} · ${link(`.changeset/${id}.md`, `${id}.md`)}`;
  if (releases.length === 0) {
    return `| – | – | ${note} |`;
  }
  const names = releases.map(({ name }) => `\`${name}\``).join(", ");
  return `| ${highest(releases)} | ${names} | ${note} |`;
}

/** @param {import("./lib.mjs").Changeset[]} changesets */
function changesetTable(changesets) {
  return [
    "| Bump | Changelog | Release note |",
    "| :-- | :-- | :-- |",
    ...changesets.map(changesetRow),
    "",
  ];
}

/**
 * @param {number} count
 * @param {string} word
 */
function plural(count, word) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function appNames() {
  return readApps()
    .map(({ name }) => `\`${name}\``)
    .join(", ");
}

/** @param {import("./lib.mjs").ChangesetCheck | undefined} check */
function unavailable(check) {
  return !check || (!check.plan && !check.missing);
}

/** @param {import("./lib.mjs").ChangesetCheck | undefined} check */
function render(check) {
  const lines = ["## 🦋 Changeset", ""];
  const changesets = check?.plan?.changesets ?? [];
  const notes = changesets.filter(({ releases }) => releases.length > 0);

  if (!check || unavailable(check)) {
    lines.push(
      "> [!CAUTION]",
      `> **Changeset status unavailable**: \`changeset status\` failed, so the release plan is missing, not empty. See the [run log](${runUrl}).`,
      "",
    );
  } else if (
    check.missing ||
    (changesets.length === 0 && check.errors.length > 0)
  ) {
    const reason = check.missing
      ? "this PR changes files that ship and adds none."
      : check.errors.map(({ message }) => message).join(" ");
    lines.push(
      "> [!CAUTION]",
      `> **Changeset required**, so the **Changesets** step of CI fails: ${reason}`,
      "",
      "```sh",
      "pnpm changeset --patch <app> -m '<what changes for operators>'",
      "pnpm changeset --empty -m '<why nothing observable changes>'",
      "```",
      "",
      `Name the apps whose behavior changes (${appNames()}), never an \`@repo/*\` package; \`--minor\` for a new capability. [Do I need one?](${guideUrl}#do-i-need-one)`,
      "",
    );
  } else if (check.errors.length > 0) {
    lines.push(
      "> [!CAUTION]",
      `> **${plural(check.errors.length, "changeset problem")}**, so the **Changesets** step of CI fails.`,
      "",
      "| Changeset | Problem | Fix |",
      "| :-- | :-- | :-- |",
      ...check.errors.map(
        ({ file, message, help }) =>
          `| ${link(file)} | ${cell(message)} | ${cell(help)} |`,
      ),
      "",
      ...changesetTable(changesets),
    );
  } else if (notes.length > 0) {
    const bump = highest(notes.flatMap(({ releases }) => releases));
    lines.push(
      `**${bump[0].toUpperCase()}${bump.slice(1)} bump** from ${plural(notes.length, "release note")}; every app bumps together (${appNames()}).`,
      "",
      ...changesetTable(changesets),
    );
  } else if (changesets.length > 0) {
    lines.push(
      "**No release.** This PR's changesets are empty: nothing observable changes.",
      "",
      ...changesetTable(changesets),
    );
  } else if (check.warnings.length > 0) {
    lines.push(
      "> [!WARNING]",
      `> **No changeset, partly unchecked.** ${check.warnings.map(({ rule, message, help }) => `\`${rule}\`: ${message} Fix: ${help}`).join(" ")}`,
      "",
    );
  } else {
    lines.push("✅ **No changeset needed.** No file that ships changed.", "");
  }

  lines.push(
    `<sub>[\`${HEAD_SHA.slice(0, 7)}\`](${repoUrl}/commit/${HEAD_SHA}) · [changeset guide](${guideUrl}) · [run log](${runUrl})</sub>`,
  );
  return lines.join("\n");
}

async function evaluate() {
  try {
    return await checkChangesets();
  } catch (error) {
    console.error(`::error title=Changeset status::${String(error)}`);
    return undefined;
  }
}

const check = await evaluate();
const body = render(check);

console.log(body);
appendFileSync(GITHUB_STEP_SUMMARY, `${body}\n`);
const delimiter = `EOF_${randomUUID()}`;
appendFileSync(GITHUB_OUTPUT, `body<<${delimiter}\n${body}\n${delimiter}\n`);

if (unavailable(check)) {
  console.error(
    "::error title=Changeset status::`changeset status` failed; see its output above.",
  );
  process.exitCode = 1;
}
