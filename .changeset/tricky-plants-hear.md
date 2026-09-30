---
"front-app": minor
"worker-api": minor
---

Build and deploy both apps with the Cloudflare CLI (`cf`) instead of Wrangler

Each app is configured by a typed `cloudflare.config.ts` instead of `wrangler.jsonc`. CD uploads with `cf workers versions create` and promotes with `cf workers deployments create`; Wrangler remains only for `wrangler tail`, single secret puts, and Preview deletion and secrets.

Deployed Worker names, bindings, observability settings, and responses are unchanged. Previews now bind `SENTRY_DSN` to an empty string instead of leaving it unset, so Sentry stays off there as before.
