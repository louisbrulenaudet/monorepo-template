# Stage 1 bootstrap inventory

Read-only checklist before treating a Worker as eligible for recurring `versions upload`. First publish uses `wrangler deploy` (bootstrap), not upload.

## Required remote facts

For each of `worker-api-production` and `front-app-production`:

1. The Worker **exists** and has been published at least once.
2. Active deployment ID and version ID are recorded.
3. Routes / custom domains (if any) are known and out of the upload path.
4. Preview URL posture: disabled, or Access-protected (public production-bound previews are not accepted).
5. No production user traffic attached during bootstrap; attach routes/domains only after the first successful publish.

## How to collect

From the repo root (human Cloudflare auth):

```sh
node scripts/cd/inventory.mjs
```

Or per app:

```sh
pnpm --filter=worker-api exec wrangler deployments list --env production --json
pnpm --filter=front-app exec wrangler deployments list --env production --json
pnpm --filter=worker-api exec wrangler versions list --env production --json
pnpm --filter=front-app exec wrangler versions list --env production --json
```

## Fail closed

- Missing Worker → bootstrap with `pnpm --filter=<app> run deploy` **before** production traffic, then re-run inventory.
- Do not put bootstrap into the recurring `main` upload job.
