/**
 * Canonical absolute package directory for Vitest `root` / `test.dir`.
 *
 * Pass `import.meta.dirname` from the app's vitest.config.* — never call this
 * without an argument (that would resolve this package, not the app).
 */
export declare function resolvePackageRoot(configDir: string): string;
