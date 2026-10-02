import { randomUUID } from "node:crypto";
import { appendFileSync, readFileSync } from "node:fs";
import path from "node:path";

const MAX_ROWS = 20;
const KNIP_STEPS = [
  "knip-head",
  "knip-production-head",
  "knip-base",
  "knip-production-base",
];
const JSCPD_STEPS = ["jscpd-new", "jscpd-resolved"];
const KNIP_LABELS = {
  files: "Unused file",
  dependencies: "Unused dependency",
  devDependencies: "Unused devDependency",
  optionalPeerDependencies: "Referenced optional peerDependency",
  unlisted: "Unlisted dependency",
  binaries: "Unlisted binary",
  unresolved: "Unresolved import",
  exports: "Unused export",
  nsExports: "Export in used namespace",
  types: "Unused exported type",
  nsTypes: "Exported type in used namespace",
  enumMembers: "Unused enum member",
  namespaceMembers: "Unused namespace member",
  duplicates: "Duplicate export",
  catalog: "Unused catalog entry",
  catalogReferences: "Unresolved catalog reference",
  cycles: "Circular dependency",
};

for (const name of [
  "QUALITY_DIR",
  "BASE_SHA",
  "HEAD_SHA",
  "GITHUB_SHA",
  "GITHUB_SERVER_URL",
  "GITHUB_REPOSITORY",
  "GITHUB_RUN_ID",
  "GITHUB_OUTPUT",
  "GITHUB_STEP_SUMMARY",
  "STEPS",
]) {
  if (!process.env[name]) {
    throw new Error(`${name} is required`);
  }
}

const {
  QUALITY_DIR,
  BASE_SHA,
  HEAD_SHA,
  GITHUB_SHA,
  GITHUB_SERVER_URL,
  GITHUB_REPOSITORY,
  GITHUB_RUN_ID,
  GITHUB_OUTPUT,
  GITHUB_STEP_SUMMARY,
  STEPS,
} = process.env;
const steps = JSON.parse(STEPS);
const repoUrl = `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}`;
const runUrl = `${repoUrl}/actions/runs/${GITHUB_RUN_ID}`;

/**
 * @typedef {object} Tool
 * @property {string} title
 * @property {string} name
 * @property {"success" | "failure" | "skipped"} status
 * @property {string[]} header Columns of the new-findings table
 * @property {string[][]} added
 * @property {string[][]} resolved `[finding, location]` rows at the base
 * @property {string} [footer]
 * @property {string} [legend]
 */

/** @param {string} file */
function readReport(file) {
  return JSON.parse(readFileSync(path.join(QUALITY_DIR, file), "utf8"));
}

/** @param {string[]} ids */
function outcome(ids) {
  const outcomes = ids.map((id) => steps[id]?.outcome ?? "skipped");
  if (outcomes.includes("failure")) {
    return "failure";
  }
  return outcomes.every((value) => value === "success") ? "success" : "skipped";
}

/** @param {string} text */
function cell(text) {
  return text.replaceAll("|", String.raw`\|`);
}

/**
 * @param {string} sha
 * @param {string} file
 * @param {...(number | undefined)} lines
 */
function location(sha, file, ...lines) {
  const span = [...new Set(lines.filter((line) => line !== undefined))];
  const label = span.length > 0 ? `${file}:${span.join("–")}` : file;
  const anchor =
    span.length > 0 ? `#${span.map((line) => `L${line}`).join("-")}` : "";
  return `[\`${cell(label)}\`](${repoUrl}/blob/${sha}/${encodeURI(file)}${anchor})`;
}

/** @param {string} sha */
function commit(sha) {
  return `[\`${sha.slice(0, 7)}\`](${repoUrl}/commit/${sha})`;
}

/**
 * @template T
 * @param {Map<string, T>} from
 * @param {Map<string, T>} without
 */
function difference(from, without) {
  return [...from]
    .filter(([key]) => !without.has(key))
    .map(([, value]) => value);
}

/** @param {string[]} files Default pass first, then the production pass */
function readKnip(files) {
  const findings = new Map();
  for (const file of files) {
    for (const row of readReport(file).issues) {
      for (const [type, entries] of Object.entries(row)) {
        if (type === "owners" || !Array.isArray(entries)) {
          continue;
        }
        for (const entry of entries) {
          const symbols = [entry].flat();
          const name =
            type === "files"
              ? ""
              : symbols
                  .map((symbol) => symbol.name)
                  .join(type === "cycles" ? " → " : ", ");
          const key = [type, row.file, name].join("\0");
          if (!findings.has(key)) {
            findings.set(key, {
              type,
              file: row.file,
              name,
              line: symbols[0]?.line,
              production: file.includes("production"),
            });
          }
        }
      }
    }
  }
  return findings;
}

/** @param {string} sha */
function knipRow(sha) {
  return (finding) => {
    const symbol = finding.name ? ` \`${cell(finding.name)}\`` : "";
    const production = finding.production ? " · test-only" : "";
    return [
      `${KNIP_LABELS[finding.type] ?? finding.type}${symbol}${production}`,
      location(sha, finding.file, finding.line),
    ];
  };
}

function knip() {
  const head = readKnip(["knip-head.json", "knip-production-head.json"]);
  const base = readKnip(["knip-base.json", "knip-production-base.json"]);
  const added = difference(head, base);
  return {
    header: ["Finding", "Location"],
    added: added.map(knipRow(GITHUB_SHA)),
    resolved: difference(base, head).map(knipRow(BASE_SHA)),
    legend: added.some((finding) => finding.production)
      ? "<sub>test-only: only tests or tooling use it (`pnpm knip:production`). Test through the real entry, or tag a test-only export `@internal`.</sub>"
      : undefined,
  };
}

/** @param {string} file Its paths are relative to the scanned directory */
function readClones(file) {
  const { statistics, duplicates } = readReport(file);
  return {
    percentage: statistics.total.percentage,
    clones: duplicates.filter((clone) => clone.isNew),
  };
}

/** @param {number} value */
function percent(value) {
  return `${value.toFixed(2)}%`;
}

/** @param {string} sha */
function cloneRow(sha) {
  return ({ lines, firstFile, secondFile }) => [
    `${lines} lines`,
    location(sha, firstFile.name, firstFile.start, firstFile.end),
    location(sha, secondFile.name, secondFile.start, secondFile.end),
  ];
}

function jscpd() {
  const head = readClones("jscpd-new/jscpd-report.json");
  const base = readClones("jscpd-resolved/jscpd-report.json");
  return {
    header: ["Size", "Block", "Also at"],
    added: head.clones.map(cloneRow(GITHUB_SHA)),
    resolved: base.clones
      .map(cloneRow(BASE_SHA))
      .map(([size, first, second]) => [
        `Duplicated block (${size})`,
        `${first} ↔ ${second}`,
      ]),
    footer: `repo duplication ${percent(head.percentage)}`,
  };
}

/**
 * @param {string} title
 * @param {string} name
 * @param {string[]} ids
 * @param {() => Omit<Tool, "title" | "name" | "status">} analyze
 * @returns {Tool}
 */
function run(title, name, ids, analyze) {
  const empty = { title, name, header: [], added: [], resolved: [] };
  const status = outcome(ids);
  if (status !== "success") {
    return { ...empty, status };
  }
  try {
    return { title, name, status, ...analyze() };
  } catch (error) {
    console.error(
      `::error::${name} wrote an unreadable report: ${String(error)}`,
    );
    return { ...empty, status: "failure" };
  }
}

/**
 * @param {string[]} header
 * @param {string[][]} rows
 * @param {number} limit
 * @param {string[]} [align] Delimiter-row cells, e.g. `:-:` to center
 */
function table(header, rows, limit, align = header.map(() => ":--")) {
  const lines = [
    `| ${header.join(" | ")} |`,
    `| ${align.join(" | ")} |`,
    ...rows.slice(0, limit).map((row) => `| ${row.join(" | ")} |`),
  ];
  if (rows.length > limit) {
    lines.push(
      `| _…and ${rows.length - limit} more in the [run summary](${runUrl})_ |${" |".repeat(header.length - 1)}`,
    );
  }
  return [...lines, ""];
}

/** @param {Tool} tool */
function summaryRow(tool) {
  const check = `${tool.title} (${tool.name})`;
  if (tool.status !== "success") {
    return [check, "–", "–", "❌ Did not run"];
  }
  const added = tool.added.length;
  return [
    check,
    added > 0 ? `**${added}**` : "0",
    String(tool.resolved.length),
    added > 0 ? "⚠️" : "✅",
  ];
}

/**
 * @param {number} count
 * @param {string} word
 */
function plural(count, word) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

/**
 * @param {Tool[]} tools
 * @param {number} limit Rows per table
 */
function render(tools, limit) {
  const failed = tools.filter((tool) => tool.status !== "success");
  const added = tools.reduce((sum, tool) => sum + tool.added.length, 0);
  const resolved = tools.flatMap((tool) =>
    tool.resolved.map(([finding, where]) => [
      `${finding} (${tool.name})`,
      where,
    ]),
  );
  const lines = ["## Code quality", ""];

  if (failed.length > 0) {
    const names = failed.map((tool) => tool.name).join(" and ");
    const findings =
      added > 0 ? ` **${plural(added, "new finding")}** below.` : "";
    lines.push(
      "> [!CAUTION]",
      `> **${names} did not run**, so ${failed.length === 1 ? "its" : "their"} results are missing, not clean.${findings} See the [run log](${runUrl}).`,
      "",
    );
  } else if (added > 0) {
    const counts = tools
      .map(
        (tool) =>
          `${tool.added.length} ${tool.title.toLowerCase()} (${tool.name})`,
      )
      .join(", ");
    lines.push(
      "> [!WARNING]",
      `> **${plural(added, "new finding")}**: ${counts}. Informational: this check never blocks merging.`,
      "",
    );
  } else {
    const fixed =
      resolved.length > 0
        ? ` Resolves ${plural(resolved.length, "existing finding")}. 🎉`
        : "";
    lines.push(`✅ **No new unused code or duplication.**${fixed}`, "");
  }

  if (failed.length > 0) {
    lines.push(
      ...table(
        ["Check", "New", "Resolved", "Status"],
        tools.map(summaryRow),
        limit,
        [":--", ":-:", ":-:", ":--"],
      ),
    );
  }
  for (const tool of tools.filter((item) => item.added.length > 0)) {
    lines.push(
      `### ${tool.title} (${tool.name}) · ${tool.added.length} new`,
      "",
      ...table(tool.header, tool.added, limit),
    );
    if (tool.legend) {
      lines.push(tool.legend, "");
    }
  }
  if (resolved.length > 0) {
    lines.push(
      `<details><summary><b>${resolved.length} resolved</b></summary>`,
      "",
      ...table(["Resolved", "Location at base"], resolved, limit),
      "</details>",
      "",
    );
  }
  const footer = [
    `${commit(HEAD_SHA)} merged into ${commit(BASE_SHA)}`,
    ...tools.flatMap((tool) => tool.footer ?? []),
    "all findings: `pnpm knip`, `pnpm jscpd`",
    `[run log](${runUrl})`,
  ];
  lines.push(`<sub>${footer.join(" · ")}</sub>`);
  return lines.join("\n");
}

const tools = [
  run("Unused code", "Knip", KNIP_STEPS, knip),
  run("Duplication", "jscpd", JSCPD_STEPS, jscpd),
];
const body = render(tools, MAX_ROWS);
const failed = tools.filter((tool) => tool.status !== "success");

console.log(body);
appendFileSync(GITHUB_STEP_SUMMARY, `${render(tools, Infinity)}\n`);
const delimiter = `EOF_${randomUUID()}`;
appendFileSync(GITHUB_OUTPUT, `body<<${delimiter}\n${body}\n${delimiter}\n`);

if (failed.length > 0) {
  for (const tool of failed) {
    console.error(
      `::error title=Code quality::${tool.name} did not produce a report (${tool.status}); see its step log.`,
    );
  }
  process.exitCode = 1;
}
