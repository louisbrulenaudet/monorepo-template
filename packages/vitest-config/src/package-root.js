import { realpathSync } from "node:fs";

/**
 * Canonical absolute package directory for Vitest `root` / `test.dir`.
 *
 * @param {string} configDir
 * @returns {string}
 */
export function resolvePackageRoot(configDir) {
  return realpathSync(configDir);
}
