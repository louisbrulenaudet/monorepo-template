import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const APPS_DIR = "apps";

/**
 * @typedef {object} App
 * @property {string} name Npm name, and the `pnpm --filter` selector
 * @property {string} dir Directory name under `apps/`
 * @property {string} version
 * @property {number} deployOrder `monorepo.deployOrder`; lower promotes first
 */

/**
 * @param {string} filePath
 * @returns {unknown}
 */
function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

/**
 * @param {string} dir Directory name under `apps/`
 * @returns {App}
 */
function readApp(dir) {
  const manifestPath = path.join(APPS_DIR, dir, "package.json");
  const manifest = readJson(manifestPath);
  if (manifest === null || typeof manifest !== "object") {
    throw new Error(`Not a JSON object: ${manifestPath}`);
  }

  const name = "name" in manifest ? manifest.name : undefined;
  const version = "version" in manifest ? manifest.version : undefined;
  if (typeof name !== "string" || typeof version !== "string") {
    throw new Error(`Missing string name/version in ${manifestPath}`);
  }

  const monorepo = "monorepo" in manifest ? manifest.monorepo : undefined;
  const deployOrder =
    monorepo !== null &&
    typeof monorepo === "object" &&
    "deployOrder" in monorepo
      ? monorepo.deployOrder
      : undefined;
  if (typeof deployOrder !== "number" || !Number.isInteger(deployOrder)) {
    throw new Error(
      `Missing integer monorepo.deployOrder in ${manifestPath}. Every app declares ` +
        "where it sits in the production promote order (gateways before the SPAs that call them).",
    );
  }

  return { name, dir, version, deployOrder };
}

/**
 * Every deployable app under `apps/`, in promote order.
 *
 * @returns {App[]}
 */
export function readApps() {
  const apps = readdirSync(APPS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => readApp(entry.name));

  if (apps.length === 0) {
    throw new Error(`No apps found under ${APPS_DIR}/`);
  }
  return apps.toSorted(
    (a, b) => a.deployOrder - b.deployOrder || a.name.localeCompare(b.name),
  );
}
