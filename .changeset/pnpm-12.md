---
---

Adopt pnpm 12.1.0 and bump `pnpm/setup` to v2.1.0.

No release: this changes the toolchain that builds the apps, not the apps themselves. Neither `front-app` nor `worker-api` has a source, dependency, or binding change, and the built output is byte-identical.

pnpm 12 is the Rust rewrite. A warm-store install of this workspace drops from 13.9s to 2.5s wall and from 16.3s to 1.0s of user CPU. The gate itself is unchanged at roughly a minute, since turbo and vitest dominate it. npm's `latest` tag still points at the pnpm 11 line, so the `packageManager` pin is what selects v12.

The lockfile gains a leading document recording `packageManagerDependencies` and the `@pnpm/exe.*` platform binaries; the existing document is unchanged byte for byte, so no peer variants were re-keyed and `lockfileVersion` stays 9.0.

`pnpm/setup` v2.1.0 caches pnpm's lockfile verification results, which cost 24.5s per cold runner here because of `minimumReleaseAge`, `trustPolicy`, `blockExoticSubdeps` and `strictDepBuilds`.
