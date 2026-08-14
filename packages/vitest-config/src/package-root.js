import { realpathSync } from "node:fs";

/**
 * Canonical absolute package directory for Vitest `root` / `test.dir`.
 *
 * The Vitest VS Code explorer caches the workspace folder via `realpathSync`
 * and walks parents of each test file until that cache hits. Passing a
 * non-realpathed `import.meta.dirname` can miss the cache on macOS (symlinks)
 * and throw: Fatal Error: Attempted to get parent of root folder "/".
 *
 * Pass `import.meta.dirname` from the app's vitest.config.* — never call this
 * without an argument (that would resolve this package, not the app).
 *
 * Plain `.js` so Node can resolve this from Vitest config loading (Vite strips
 * `.ts` from relative imports; directory imports are unsupported in ESM).
 *
 * @param {string} configDir
 * @returns {string}
 */
export function resolvePackageRoot(configDir) {
  return realpathSync(configDir);
}
