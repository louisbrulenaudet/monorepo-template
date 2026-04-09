# Review configuration command

Run a **configuration-focused** review: environment and secrets handling, Cloudflare/wrangler setup, TypeScript and Biome configs, Vite and Wrangler configuration, build modes, and dev/staging/prod parity. Your reply must be a **plan of suggested changes**: concise, actionable, and structured—not only prose.

## Cursor command usage

This file is a [Cursor custom command](https://docs.cursor.com/context/commands): plain Markdown in `.cursor/commands/`. When the user runs `/review-configuration` in chat, this content is sent as the prompt.

- **Parameters:** Any text after `/review-configuration` is scope—e.g. `/review-configuration env only`, `/review-configuration front-app`—narrow accordingly. If none given, assume all configuration (env, wrangler, TS, Biome, Vite).

This command is project-scoped and works with @ mentions and Rules. For a full review use `/review` instead.

## Best practices alignment

- **Secrets** — Never in repo or client bundle; use `.dev.vars` (workers) and wrangler env; document required vars in `.dev.vars.example`.
- **Environment** — Clear split: client-exposed keys via Vite (`import.meta.env`, e.g. `VITE_*` if used); server-only secrets and config in Workers; build modes (development/production) consistent across tools.
- **TypeScript** — Strict mode everywhere; shared configs from `@repo/typescript-config`; no conflicting compiler options between root and apps.
- **Biome** — Single source of truth for format and lint; VCS integration; consistent rules; no conflicting formatters (e.g. Prettier).
- **Cloudflare** — Wrangler and Vite build aligned; compatibility date and flags documented; bindings and env match usage; `front-app` assets (SPA) and `worker-api` worker entry configured correctly.

Align with root [AGENTS.md](AGENTS.md) and app AGENTS.md for stated config and port allocation.

## Deep technical review

Conduct a configuration-only review. Inspect the following and call out violations or improvements.

### Environment and secrets

- **Artifacts:** [apps/worker-api/.dev.vars.example](apps/worker-api/.dev.vars.example), [apps/front-app/wrangler.jsonc](apps/front-app/wrangler.jsonc), [apps/worker-api/wrangler.jsonc](apps/worker-api/wrangler.jsonc), any `.env*` or `import.meta.env` usage in [apps/front-app/src/](apps/front-app/src/), [apps/worker-api/src/](apps/worker-api/src/).
- **Checks:** `.dev.vars` is gitignored; `.dev.vars.example` lists every required variable with placeholder or description (no real secrets). Wrangler `vars` and `[env.*.vars]` only for non-secret config; secrets only in wrangler secret or `.dev.vars`. No secrets in client-bundled code; only intentionally exposed env keys via Vite (document which prefixes are safe).

### Cloudflare Workers and wrangler

- **Artifacts:** [apps/front-app/wrangler.jsonc](apps/front-app/wrangler.jsonc), [apps/front-app/vite.config.ts](apps/front-app/vite.config.ts), [apps/worker-api/wrangler.jsonc](apps/worker-api/wrangler.jsonc).
- **Checks:** `compatibility_date` is set and reasonably current. Flags (e.g. `nodejs_compat`) are intentional and documented if non-default. front-app: SPA/static assets configuration (e.g. `assets`, `not_found_handling`) matches Vite build output. worker-api: dev port (e.g. 8725) matches AGENTS.md; production env and routes match deployment.

### Vite (React frontend)

- **Artifacts:** [apps/front-app/vite.config.ts](apps/front-app/vite.config.ts), [apps/front-app/tsconfig.json](apps/front-app/tsconfig.json).
- **Checks:** Plugins order (e.g. React, Tailwind, `@cloudflare/vite-plugin`); build target and chunk strategy; no dev-only options in production build. Local dev parity with deployed behavior where relevant.

### TypeScript configuration

- **Artifacts:** Root [tsconfig.json](tsconfig.json), [packages/typescript-config/](packages/typescript-config/) (base.json, workers.json, workers-lib.json, vite-react.json, vite-node.json), [apps/front-app/tsconfig.json](apps/front-app/tsconfig.json), [apps/worker-api/tsconfig.json](apps/worker-api/tsconfig.json), [packages/dtos-common/tsconfig.json](packages/dtos-common/tsconfig.json), [packages/enums-common/tsconfig.json](packages/enums-common/tsconfig.json).
- **Checks:** All extend from `@repo/typescript-config` where appropriate. `strict` (or equivalent) enabled everywhere. No overrides that disable strictness without justification. Paths or project references consistent; no broken references. Workers use workers.json (or workers-lib); Vite React apps use vite-react.json; base.json is the shared strict base.

### Biome

- **Artifacts:** [biome.json](biome.json), [.biomeignore](.biomeignore).
- **Checks:** Single biome config at root; apps/packages don’t override unless necessary (and documented). Format: spaces, double quotes, line width per AGENTS.md. Lint: recommended rules; no disabled rules that hide real issues without a reason. VCS integration enabled. Ignore list excludes build outputs and generated files. No Prettier (or other formatter) in use to avoid conflicts.

### Build modes and reproducibility

- **Artifacts:** Root and app [package.json](package.json) scripts, [turbo.json](turbo.json), [.npmrc](.npmrc).
- **Checks:** `build` uses production mode (e.g. `NODE_ENV=production` or equivalent). Dev and build use same Node version (engines field). Lockfile is committed; CI uses `--frozen-lockfile`. packageManager in package.json matches pnpm version. .npmrc settings (e.g. shamefully-hoist, strict peer deps) are intentional and documented if non-default.

### Anti-patterns to flag

- Secrets in repo, in client bundle, or in wrangler.jsonc as plain text.
- Missing or outdated `.dev.vars.example`; required env vars not documented.
- TypeScript strict disabled or `any` encouraged by config.
- Multiple formatters or conflicting lint configs.
- Wrangler compatibility_date very old; or flags that are deprecated/removed.
- Vite build output path and wrangler `assets` / SPA settings mismatch.

## Steps

1. **Gather scope** — All config or specific area (env, wrangler, TS, Biome, Vite). Default to full configuration review.
2. **Read conventions** — Root and app AGENTS.md for env, ports, and tooling.
3. **Inspect env and secrets** — .dev.vars.example, wrangler vars, codebase for env usage; confirm no secrets in client or repo.
4. **Inspect wrangler and Vite** — Both wrangler.jsonc files; front-app vite.config.ts; alignment between build output and deployment.
5. **Inspect TypeScript** — All tsconfig files and typescript-config package; strict and extends chain.
6. **Inspect Biome** — biome.json and .biomeignore; format/lint rules and ignore list.
7. **Inspect build and lockfile** — package.json scripts, turbo.json, .npmrc, engines; reproducibility and build mode.
8. **Compose plan** — Critical / Improvements / Optional; each item: **what**, **where**, **why**. One-line "no issues" per sub-area if none.

## Checklist

- [ ] Scope clear
- [ ] Root and app AGENTS.md consulted
- [ ] Env and secrets handling reviewed (.dev.vars, wrangler, Vite env)
- [ ] Both wrangler.jsonc and front-app vite.config.ts reviewed
- [ ] All tsconfig and typescript-config reviewed
- [ ] biome.json and .biomeignore reviewed
- [ ] Build mode and reproducibility (scripts, turbo, .npmrc, lockfile) reviewed
- [ ] Plan structured as Critical / Improvements / Optional with what/where/why

## Context usage

- Use `@file` for config files (wrangler.jsonc, vite.config.ts, tsconfig.json, biome.json).
- Use `@code` for env or config snippets when suggesting changes.
- Use `@docs` for Cloudflare/Biome/TypeScript when checking correct options.

If context is insufficient, suggest which config files or @ references to add.

## Review checklist

- **Correctness:** Config options are valid and consistent; no secrets exposed.
- **Conventions:** Matches AGENTS.md (ports, env, TypeScript strict, Biome).
- **Quality:** Reproducible builds; clear env contract; strict typing.
- **Actionability:** Every suggestion is implementable (e.g. "add X to .dev.vars.example", "set strict: true in Y").
- **Trade-offs:** Note any (e.g. nodejs_compat vs bundle size).
- **Scope:** Configuration only; defer security or performance to their reviews.

## Output format

Respond with a **plan** only (no implementation unless the user asks):

1. **Critical** – Must-fix (secrets in repo/client, broken build, strict disabled, wrangler/Vite mismatch).
2. **Improvements** – Worthwhile (documentation of env, clearer TS/Biome rules, compatibility date update).
3. **Optional** – Nice-to-haves (comments in config, minor tidy). Prefix with **Nit:** for non-blocking polish.

For each item: **what** to change, **where** (file/area), and **why**. If a sub-area has no findings, state it in one line.
