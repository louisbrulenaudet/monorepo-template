/** Shared helpers for Stage 1 CD scripts (Node, no deps). */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

export const DEPLOYABLES = Object.freeze({
  "worker-api": {
    packageName: "worker-api",
    actualWorkerName: "worker-api-production",
    spaApiOrigin: false,
  },
  "front-app": {
    packageName: "front-app",
    actualWorkerName: "front-app-production",
    spaApiOrigin: true,
  },
});

export const SHARED_CONTRACT_PACKAGES = Object.freeze([
  "@repo/dtos-common",
  "@repo/enums-common",
]);

export function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

export function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: options.cwd ?? ROOT,
    encoding: "utf8",
    stdio: options.stdio ?? ["ignore", "pipe", "pipe"],
    env: { ...process.env, ...options.env },
  });
}

export function runInherit(command, args, options = {}) {
  execFileSync(command, args, {
    cwd: options.cwd ?? ROOT,
    stdio: "inherit",
    env: { ...process.env, ...options.env },
  });
}

export function ensureParentDir(filePath) {
  mkdirSync(dirname(filePath), { recursive: true });
}

export function writeJson(filePath, value) {
  ensureParentDir(filePath);
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

export function parseWranglerNdjson(filePath) {
  if (!existsSync(filePath)) {
    return [];
  }
  return readFileSync(filePath, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

export function findVersionUpload(entries) {
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    const entry = entries[i];
    if (entry?.type === "version-upload" && entry.version_id) {
      return entry;
    }
  }
  return null;
}

export function gitRevParse(ref) {
  try {
    return run("git", ["rev-parse", "--verify", ref]).trim();
  } catch {
    return null;
  }
}

export function assertResolvableRange(base, head) {
  if (!base || !head) {
    fail("affected base/head are required");
  }
  if (/^0+$/.test(base)) {
    fail(`affected base is unresolved (${base}); refuse to upload`);
  }
  if (!gitRevParse(base)) {
    fail(`affected base ${base} is not a known git object`);
  }
  if (!gitRevParse(head)) {
    fail(`affected head ${head} is not a known git object`);
  }
}
