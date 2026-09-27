import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SKILL_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEPS_DIR = path.join(SKILL_DIR, "deps");
const REPO_ROOT = path.resolve(SKILL_DIR, "../../..");
const MAX_LISTED_CHANGES = 10;

/**
 * @param {string} cmd
 * @param {string[]} args
 * @returns {{ ok: boolean, status: number, out: string }}
 */
function run(cmd, args) {
  try {
    const out = execFileSync(cmd, args, {
      cwd: REPO_ROOT,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      stdio: ["ignore", "pipe", "ignore"],
    });
    return { ok: true, status: 0, out };
  } catch (error) {
    const out = typeof error?.stdout === "string" ? error.stdout : "";
    return { ok: false, status: typeof error?.status === "number" ? error.status : -1, out };
  }
}

/**
 * @param {string} value
 * @returns {string | string[]}
 */
function parseValue(value) {
  const trimmed = value.trim();
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return trimmed
      .slice(1, -1)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return trimmed;
}

/**
 * @typedef {{ id: string, summary: string, families: string[], packages: string[], paths: string[], version_cmd?: string, file: string }} Dep
 * @returns {Dep[]}
 */
function readRegistry() {
  return readdirSync(DEPS_DIR)
    .filter((name) => name.endsWith(".md"))
    .sort()
    .map((name) => {
      const text = readFileSync(path.join(DEPS_DIR, name), "utf8");
      const match = /^---\n([\s\S]*?)\n---\n/.exec(text);
      if (!match) {
        throw new Error(`deps/${name} has no frontmatter`);
      }
      /** @type {Record<string, string | string[]>} */
      const fields = {};
      for (const line of match[1].split("\n")) {
        const colon = line.indexOf(":");
        if (colon > 0) {
          fields[line.slice(0, colon).trim()] = parseValue(line.slice(colon + 1));
        }
      }
      const list = (key) => {
        const value = fields[key] ?? [];
        return Array.isArray(value) ? value : [value];
      };
      const id = String(fields.id ?? "");
      if (`${id}.md` !== name) {
        throw new Error(`deps/${name} declares id "${id}"`);
      }
      return {
        id,
        summary: String(fields.summary ?? ""),
        families: list("families"),
        packages: list("packages"),
        paths: list("paths"),
        version_cmd: typeof fields.version_cmd === "string" ? fields.version_cmd : undefined,
        file: `deps/${name}`,
      };
    });
}

/** @param {Dep[]} registry */
function printRegistry(registry) {
  console.log("| Dep | Families | Scope |\n|-----|----------|-------|");
  for (const dep of registry) {
    console.log(`| \`${dep.id}\` | ${dep.families.join(", ")} | ${dep.summary} |`);
  }
  const families = [...new Set(registry.flatMap((dep) => dep.families))].sort();
  console.log(`\nFamilies: ${families.map((f) => `\`${f}\``).join(", ")}, \`all\`, \`changed[:<ref>]\``);
}

/** @returns {string} */
function defaultBase() {
  const tag = run("git", ["describe", "--tags", "--abbrev=0", "--match", "v*"]);
  if (tag.ok && tag.out.trim()) {
    return tag.out.trim();
  }
  const mergeBase = run("git", ["merge-base", "HEAD", "main"]);
  if (mergeBase.ok && mergeBase.out.trim()) {
    return mergeBase.out.trim();
  }
  throw new Error("changed: no v* tag and no merge-base with main; pass changed:<ref>");
}

/**
 * @param {string} glob
 * @returns {RegExp}
 */
function globToRegExp(glob) {
  let source = "";
  for (let i = 0; i < glob.length; i += 1) {
    const char = glob[i];
    if (char === "*" && glob[i + 1] === "*" && glob[i + 2] === "/") {
      source += "(?:.*/)?";
      i += 2;
    } else if (char === "*" && glob[i + 1] === "*") {
      source += ".*";
      i += 1;
    } else if (char === "*") {
      source += "[^/]*";
    } else {
      source += char.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
    }
  }
  return new RegExp(`^${source}$`);
}

/**
 * @param {Dep[]} registry
 * @param {string} base
 * @returns {Map<string, string[]>}
 */
function changedDeps(registry, base) {
  const files = new Set(
    [
      ...run("git", ["diff", "--name-only", base]).out.split("\n"),
      ...run("git", ["ls-files", "--others", "--exclude-standard"]).out.split("\n"),
    ].filter(Boolean),
  );
  const catalogDiff = run("git", ["diff", "-U0", base, "--", "pnpm-workspace.yaml"])
    .out.split("\n")
    .filter((line) => /^[+-]\s/.test(line));

  /** @type {Map<string, string[]>} */
  const reasons = new Map();
  for (const dep of registry) {
    const hits = [];
    const patterns = dep.paths.map(globToRegExp);
    for (const file of files) {
      if (patterns.some((pattern) => pattern.test(file))) {
        hits.push(file);
      }
    }
    for (const pkg of dep.packages) {
      if (catalogDiff.some((line) => new RegExp(`^[+-]\\s+'?${pkg.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}'?:`).test(line))) {
        hits.push(`catalog ${pkg}`);
      }
    }
    if (hits.length > 0) {
      reasons.set(dep.id, hits);
    }
  }
  return reasons;
}

/** @returns {Map<string, string>} */
function readCatalog() {
  const lines = readFileSync(path.join(REPO_ROOT, "pnpm-workspace.yaml"), "utf8").split("\n");
  /** @type {Map<string, string>} */
  const catalog = new Map();
  let inCatalog = false;
  for (const line of lines) {
    if (/^\S/.test(line)) {
      inCatalog = line.startsWith("catalog:");
      continue;
    }
    const match = inCatalog ? /^\s+'?([^'#:\s]+)'?:\s*(\S+)/.exec(line) : null;
    if (match) {
      catalog.set(match[1], match[2]);
    }
  }
  return catalog;
}

/** @returns {Map<string, Set<string>>} */
function readInstalled() {
  /** @type {Map<string, Set<string>>} */
  const installed = new Map();
  const result = run("pnpm", ["ls", "-r", "--depth", "0", "--json"]);
  if (!result.ok) {
    return installed;
  }
  for (const importer of JSON.parse(result.out)) {
    for (const group of [importer.dependencies, importer.devDependencies]) {
      for (const [name, info] of Object.entries(group ?? {})) {
        const versions = installed.get(name) ?? new Set();
        versions.add(info.version);
        installed.set(name, versions);
      }
    }
  }
  return installed;
}

/** @returns {Map<string, string> | null} */
function readLatest() {
  const result = run("pnpm", ["outdated", "-r", "--format", "json"]);
  // Exit 1 with JSON on stdout means "something is outdated"; anything else is a failed lookup.
  if (!(result.ok || (result.status === 1 && result.out.trim().startsWith("{")))) {
    return null;
  }
  /** @type {Map<string, string>} */
  const latest = new Map();
  for (const [name, info] of Object.entries(JSON.parse(result.out || "{}"))) {
    latest.set(name, info.latest);
  }
  return latest;
}

const registry = readRegistry();
const selector = process.argv.slice(2).join(" ").trim();

if (!selector) {
  printRegistry(registry);
  process.exit(0);
}

const byId = new Map(registry.map((dep) => [dep.id, dep]));
/** @type {Set<string>} */
const selected = new Set();
/** @type {Map<string, string[]>} */
let reasons = new Map();
const unknown = [];

for (const token of selector.split(",").map((t) => t.trim()).filter(Boolean)) {
  if (token === "all") {
    registry.forEach((dep) => selected.add(dep.id));
  } else if (token === "changed" || token.startsWith("changed:")) {
    const base = token.includes(":") ? token.slice(token.indexOf(":") + 1) : defaultBase();
    if (!run("git", ["rev-parse", "--verify", "--quiet", `${base}^{commit}`]).ok) {
      throw new Error(`changed: "${base}" is not a commit`);
    }
    reasons = changedDeps(registry, base);
    console.log(`Change base: ${base}`);
    reasons.forEach((_, id) => selected.add(id));
  } else if (byId.has(token)) {
    selected.add(token);
  } else {
    const members = registry.filter((dep) => dep.families.includes(token));
    if (members.length === 0) {
      unknown.push(token);
    }
    members.forEach((dep) => selected.add(dep.id));
  }
}

if (unknown.length > 0) {
  console.log(`Unknown selector: ${unknown.join(", ")}\n`);
  printRegistry(registry);
  process.exit(1);
}

if (selected.size === 0) {
  console.log("Nothing selected: no dep matches the changes since the base.");
  process.exit(0);
}

const catalog = readCatalog();
const installed = readInstalled();
const latest = readLatest();

console.log(`Selected (${selected.size}): ${[...selected].join(", ")}`);
if (latest === null) {
  console.log("Latest versions unavailable: `pnpm outdated` failed (registry unreachable?). Hunters look them up.");
}

for (const dep of registry.filter((d) => selected.has(d.id))) {
  console.log(`\n## ${dep.id} (${dep.file})`);
  if (reasons.has(dep.id)) {
    const hits = reasons.get(dep.id);
    const more = hits.length > MAX_LISTED_CHANGES ? ` (+${hits.length - MAX_LISTED_CHANGES} more)` : "";
    console.log(`Changed: ${hits.slice(0, MAX_LISTED_CHANGES).join(", ")}${more}`);
  }
  if (dep.version_cmd) {
    const [cmd, ...args] = dep.version_cmd.split(" ");
    const result = run(cmd, args);
    console.log(`\`${dep.version_cmd}\`: ${result.ok ? result.out.trim() : "unavailable"}`);
  }
  if (dep.packages.length > 0) {
    console.log("| Package | Catalog | Installed | Latest |\n|---------|---------|-----------|--------|");
    for (const pkg of dep.packages) {
      const versions = [...(installed.get(pkg) ?? [])];
      const current = versions.length > 0 ? versions.join(", ") : "not installed";
      const newest = latest === null ? "unknown" : (latest.get(pkg) ?? "= installed");
      console.log(`| \`${pkg}\` | ${catalog.get(pkg) ?? "-"} | ${current} | ${newest} |`);
    }
  }
}
