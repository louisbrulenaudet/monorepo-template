import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { readApps } from "../lib/apps.mjs";

export const BASE_REF = "origin/main";
export const MAX_TITLE_LENGTH = 100;

const WORKSPACE_FILE = "pnpm-workspace.yaml";
const ENTRY =
  /^(?<indent> *)(?<key>'[^']+'|"[^"]+"|[^\s'"#-][^:]*):(?:\s+(?<value>[^#]*?))?\s*(?:#.*)?$/;
const QUOTES = /^['"]|['"]$/g;
const HEADING = /^\s*#{1,6}\s/m;
const RULE = "rule ops/changesets";

/**
 * @typedef {object} Bump
 * @property {string} name
 * @property {string | undefined} from Catalog specifier at the merge base
 * @property {string | undefined} to Catalog specifier in the working tree
 */

/**
 * @typedef {object} Changeset
 * @property {string} id
 * @property {string} summary
 * @property {{ name: string; type: string }[]} releases
 */

/**
 * @typedef {object} Diagnostic
 * @property {string} file
 * @property {string} rule
 * @property {string} message
 * @property {string} help
 */

/**
 * @typedef {object} ChangesetCheck
 * @property {{ changesets: Changeset[] } | undefined} plan Undefined when
 *   `changeset status` exited non-zero
 * @property {boolean} missing It exited non-zero and no changeset changed
 * @property {Diagnostic[]} errors
 * @property {Diagnostic[]} warnings
 */

/**
 * @param {string[]} args
 * @returns {string}
 */
export function git(args) {
  return execFileSync("git", args, { encoding: "utf8" });
}

/**
 * @param {string} text `pnpm-workspace.yaml` contents
 * @returns {Map<string, Map<string, string>>} Catalog name (`default` for
 *   `catalog:`) → package → specifier
 */
function parseCatalogs(text) {
  const catalogs = new Map();
  const set = (catalog, name, specifier) => {
    if (!catalogs.has(catalog)) {
      catalogs.set(catalog, new Map());
    }
    catalogs.get(catalog).set(name, specifier);
  };

  let section;
  let named;
  for (const line of text.split("\n")) {
    const match = ENTRY.exec(line);
    if (!match?.groups) {
      continue;
    }
    const { indent, key: rawKey, value = "" } = match.groups;
    const key = rawKey.trim().replace(QUOTES, "");
    const specifier = value.replace(QUOTES, "");

    if (indent.length === 0) {
      section = key;
    } else if (section === "catalog" && indent.length === 2) {
      set("default", key, specifier);
    } else if (section === "catalogs" && indent.length === 2) {
      named = key;
    } else if (section === "catalogs" && indent.length === 4 && named) {
      set(named, key, specifier);
    }
  }
  return catalogs;
}

/**
 * @param {string} commit
 * @returns {Promise<string>}
 */
async function readWorkspaceAt(commit) {
  const {
    GITHUB_ACTIONS,
    GITHUB_API_URL = "https://api.github.com",
    GITHUB_REPOSITORY,
    GITHUB_TOKEN,
  } = process.env;
  if (GITHUB_ACTIONS !== "true") {
    return git(["show", `${commit}:${WORKSPACE_FILE}`]);
  }
  if (!GITHUB_REPOSITORY || !GITHUB_TOKEN) {
    throw new Error(
      `GITHUB_REPOSITORY and GITHUB_TOKEN are required to read ${WORKSPACE_FILE} at ${commit}`,
    );
  }
  const response = await fetch(
    `${GITHUB_API_URL}/repos/${GITHUB_REPOSITORY}/contents/${WORKSPACE_FILE}?ref=${commit}`,
    {
      headers: {
        accept: "application/vnd.github.raw+json",
        authorization: `Bearer ${GITHUB_TOKEN}`,
        "x-github-api-version": "2022-11-28",
      },
    },
  );
  if (!response.ok) {
    throw new Error(
      `Reading ${WORKSPACE_FILE} at ${commit} failed: HTTP ${response.status}`,
    );
  }
  return response.text();
}

/**
 * @param {string} baseRef
 * @returns {Promise<Map<string, Bump[]>>} App name → its changed runtime
 *   dependencies
 */
export async function runtimeCatalogChanges(baseRef) {
  const base = git(["merge-base", baseRef, "HEAD"]).trim();
  const before = parseCatalogs(await readWorkspaceAt(base));
  const after = parseCatalogs(readFileSync(WORKSPACE_FILE, "utf8"));

  const changes = new Map();
  for (const app of readApps()) {
    const manifest = JSON.parse(
      readFileSync(path.join("apps", app.dir, "package.json"), "utf8"),
    );
    const bumps = [];
    for (const [name, specifier] of Object.entries(
      manifest.dependencies ?? {},
    )) {
      if (!specifier.startsWith("catalog:")) {
        continue;
      }
      const named = specifier.slice("catalog:".length);
      const catalog = named === "" ? "default" : named;
      const from = before.get(catalog)?.get(name);
      const to = after.get(catalog)?.get(name);
      if (to === undefined) {
        throw new Error(
          `${WORKSPACE_FILE} parsed without "${name}" in catalog "${catalog}", which apps/${app.dir} depends on: the catalog parser no longer matches the file.`,
        );
      }
      if (from !== to) {
        bumps.push({ name, from, to });
      }
    }
    if (bumps.length > 0) {
      changes.set(app.name, bumps);
    }
  }
  return changes;
}

/** @returns {{ changesets: Changeset[] } | undefined} */
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

/** @returns {boolean} */
function changesetChanged() {
  const base = git(["merge-base", BASE_REF, "HEAD"]).trim();
  return (
    git([
      "diff",
      "--name-only",
      "--diff-filter=d",
      base,
      "--",
      ".changeset/*.md",
      ":(exclude).changeset/README.md",
    ]).trim() !== ""
  );
}

/** @returns {Promise<ChangesetCheck>} */
export async function checkChangesets() {
  const plan = readReleasePlan();
  if (!plan) {
    return { plan, missing: !changesetChanged(), errors: [], warnings: [] };
  }

  /** @type {Diagnostic[]} */
  const errors = [];
  /** @type {Diagnostic[]} */
  const warnings = [];
  const apps = new Set(readApps().map((app) => app.name));
  const allowMajor = process.env.CHANGESET_ALLOW_MAJOR === "1";

  for (const { id, summary, releases } of plan.changesets) {
    const file = `.changeset/${id}.md`;
    for (const { name, type } of releases) {
      if (!apps.has(name)) {
        errors.push({
          file,
          rule: "app-only",
          message: `"${name}" is not an app.`,
          help: `name the apps whose behavior changes; a package's entry never reaches the release notes (${RULE}).`,
        });
      }
      if (type === "major" && !allowMajor) {
        errors.push({
          file,
          rule: "major",
          message: `"${name}" is bumped major.`,
          help: `while the apps are 0.x a breaking change is minor with a **Breaking:** title; a deliberate major needs the release:major PR label, or CHANGESET_ALLOW_MAJOR=1 locally (${RULE}).`,
        });
      }
    }
    if (releases.length === 0) {
      continue;
    }
    const [title = ""] = summary.split("\n", 1);
    if (title.trim() === "" || title.length > MAX_TITLE_LENGTH) {
      errors.push({
        file,
        rule: "title",
        message: `the first line is ${title.length} characters.`,
        help: `one sentence of 1-${MAX_TITLE_LENGTH} characters naming the observable change; details go in the body (${RULE}).`,
      });
    }
    if (HEADING.test(summary)) {
      errors.push({
        file,
        rule: "heading",
        message: "the summary contains a Markdown heading.",
        help: `the body renders inside a changelog list item; use a **bold** lead-in instead (${RULE}).`,
      });
    }
  }

  if (
    plan.changesets.length === 0 &&
    process.env.CHANGESET_SKIP_RUNTIME_DEPENDENCIES === "1"
  ) {
    warnings.push({
      file: WORKSPACE_FILE,
      rule: "runtime-dependency",
      message:
        "not checked on a Dependabot PR without CHANGESET_BOT_TOKEN, so its runtime bumps ship without a release note.",
      help: `add a changeset by hand to record them (${RULE}).`,
    });
  } else if (plan.changesets.length === 0) {
    const changes = await runtimeCatalogChanges(BASE_REF);
    if (changes.size > 0) {
      const affected = [...changes.keys()].join(",");
      const names = [
        ...new Set([...changes.values()].flat().map((bump) => bump.name)),
      ];
      errors.push({
        file: WORKSPACE_FILE,
        rule: "runtime-dependency",
        message: `the runtime dependency bump of ${names.join(", ")} ships in ${affected}, and no changeset covers it.`,
        help: `pnpm changeset --patch ${affected} -m 'Bump …', or --empty when nothing observable changes (${RULE}).`,
      });
    }
  }

  return { plan, missing: false, errors, warnings };
}
