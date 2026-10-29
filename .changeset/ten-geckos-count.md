---
"worker-api": patch
"front-app": patch
---

Bump `hono` 4.13.14, `@tanstack/react-query` 5.105.0, and the Cloudflare and OXC toolchain

**Toolchain:** `cf` 1.0.0-beta.24, `wrangler` 4.154.0, `@cloudflare/vite-plugin` 2.0.0-beta.v.6, `@cloudflare/vitest-plugin` 1.4.9, `oxlint` 1.90.0, `oxfmt` 0.75.0, and `oxc-transform-react` 0.156.0.

The `@cloudflare/vite-plugin` bump clears the high `undici` and `zod` advisories in the local dev toolchain; none reaches a deployed app.
