import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

import { readApps } from "./apps.mjs";

export const BASE_REF = "origin/main";
export const MAX_TITLE_LENGTH = 100;

const WORKSPACE_FILE = "pnpm-workspace.yaml";
const ENTRY =
  /^(?<indent> *)(?<key>'[^']+'|"[^"]+"|[^\s'"#-][^:]*):(?:\s+(?<value>[^#]*?))?\s*(?:#.*)?$/;
const QUOTES = /^['"]|['"]$/g;

/**
 * @typedef {object} Bump
 * @property {string} name
 * @property {string | undefined} from Catalog specifier at the merge base
 * @property {string | undefined} to Catalog specifier in the working tree
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
