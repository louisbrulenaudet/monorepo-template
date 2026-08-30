import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const APPS_DIR = "apps";

/**
 * @typedef {object} App
 * @property {string} name Npm name, and the `pnpm --filter` selector
 * @property {string} dir Directory name under `apps/`
 * @property {string} version
 * @property {number} deployOrder `monorepo.deployOrder`; lower promotes first
 * @property {string} role `monorepo.role`; `http-gateway` marks the app CD
 *   smokes
 * @property {string | null} healthPath `monorepo.healthPath`; public probe
 *   path, or null for no public surface
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

  const { name, version, monorepo } = manifest;
  if (typeof name !== "string" || typeof version !== "string") {
    throw new Error(`Missing string name/version in ${manifestPath}`);
  }

  const deployOrder = monorepo?.deployOrder;
  if (!Number.isInteger(deployOrder)) {
    throw new Error(
      `Missing integer monorepo.deployOrder in ${manifestPath}. Every app declares ` +
        "where it sits in the production promote order (gateways before the SPAs that call them).",
    );
  }

  const role = monorepo?.role;
  if (typeof role !== "string" || role === "") {
    throw new Error(`Missing string monorepo.role in ${manifestPath}`);
  }

  const healthPath = monorepo?.healthPath;
  if (
    healthPath !== null &&
    (typeof healthPath !== "string" || !healthPath.startsWith("/"))
  ) {
    throw new Error(
      `Missing monorepo.healthPath in ${manifestPath}. Declare the public probe path ` +
        '(e.g. "/api/v1/health"), or null when the app has no public HTTP surface. ' +
        "An app that never declares one ships to production unverified.",
    );
  }

  return { name, dir, version, deployOrder, role, healthPath };
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

  const sorted = apps.toSorted((a, b) => a.deployOrder - b.deployOrder);
  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i].deployOrder === sorted[i - 1].deployOrder) {
      throw new Error(
        `Apps ${sorted[i - 1].name} and ${sorted[i].name} share monorepo.deployOrder ` +
          `${sorted[i].deployOrder} in ${APPS_DIR}/. Promote order must be total - give each ` +
          "app its own position (gateways before the SPAs that call them).",
      );
    }
  }
  return sorted;
}
