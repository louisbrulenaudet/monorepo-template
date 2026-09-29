---
"worker-api": minor
"front-app": minor
---

Move both apps from Wrangler to the Cloudflare CLI (`cf`, beta). Each `wrangler.jsonc` becomes a typed `cloudflare.config.ts` whose modes replace Wrangler environments (`--mode staging`, `--mode production`, Previews as the `ctx.isPreview` branch under production); both apps build with the Cloudflare Vite plugin 2.0 beta into `.cloudflare/output/` instead of `dist/`; `Env` types are generated into the gitignored `.cloudflare/types/index.d.ts` instead of a committed `worker-configuration.d.ts`; the Workers Vitest pool reads the `test` mode of `cloudflare.config.ts`; and CD uploads with `cf workers versions create` and promotes with `cf workers deployments create`. Deployed Worker names, bindings, observability settings, and responses are unchanged, except that Previews now bind `SENTRY_DSN` to an empty string instead of leaving it unset, which keeps Sentry off there as before. Wrangler stays only for `wrangler tail`, single secret puts, and Preview deletion and secrets.
