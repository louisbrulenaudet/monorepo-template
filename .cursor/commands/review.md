# Review command

Run a review of the current context (code, PR, or docs). Your reply must be a **plan of suggested changes**: concise, actionable, and structured—not only prose.

## Cursor command usage

This file is a [Cursor custom command](https://docs.cursor.com/context/commands): plain Markdown in `.cursor/commands/`. When the user runs `/review` in chat, this content is sent as the prompt.

- **Parameters:** Any text the user types after `/review` is included in the prompt as additional context. Treat it as scope or focus—e.g. `/review full codebase`, `/review only worker-api`, `/review focus on security`—and narrow or prioritize the review accordingly. If no extra text is given, assume the current context (selection, open files, or full project) and apply the full review flow below.

This command is project-scoped and works together with @ mentions and Rules for context.

## Best practices alignment

This command is designed to align with industry best practices for (AI-assisted) code and technical reviews:

- **Explicit scope and dimensions** — Clear categories (architecture, scalability, performance, security, maintainability, CI) so feedback is scoped and not generic.
- **Context and conventions** — Reference to AGENTS.md and key artifacts ensures context-aware, project-aligned suggestions.
- **Actionable, explainable feedback** — Every item requires **what**, **where**, and **why**; suggestions must be implementable.
- **Structured output** — Critical / Improvements / Optional with headings and bullets for scannable plans.
- **Conduct and scope** — Be constructive and specific. Stay in scope; call out out-of-scope concerns as separate follow-up items. For minor polish, prefix with **Nit:** so the author knows it's non-blocking.
- **Trade-offs** — When a suggestion involves trade-offs (e.g. performance vs readability), mention them briefly so the author can decide.
- **Cursor commands** — Plain Markdown in `.cursor/commands/`; content is the prompt when the user runs the command; text after the command name is additional context (scope/focus). See [Cursor – Commands](https://docs.cursor.com/context/commands).

## Deep technical review

When asked for a full or deep codebase review, conduct a deep, end-to-end technical review with the objective of bringing the codebase to state-of-the-art production standards. Your analysis should be critical, exhaustive, and opinionated where justified. Align with the root [AGENTS.md](AGENTS.md) and app-level [apps/worker-api/AGENTS.md](apps/worker-api/AGENTS.md) for conventions and architecture.

**Key artifacts to consider:** Root and app `package.json` / `pnpm-workspace.yaml` / `turbo.json`; `make/` and root `Makefile`; [apps/front-app/vite.config.ts](apps/front-app/vite.config.ts) (React, Tailwind, `@cloudflare/vite-plugin`); [apps/front-app/wrangler.jsonc](apps/front-app/wrangler.jsonc) (SPA assets, env); [apps/worker-api/wrangler.jsonc](apps/worker-api/wrangler.jsonc); `apps/worker-api/src/index.ts` (middleware order, routes); shared DTOs in `packages/dtos-common/` and enums in `packages/enums-common/`; `.github/workflows/ci.yml`; `.dev.vars` usage and secrets handling.

Cover the following dimensions (if a dimension yields no findings, say so in one line in the plan):

- **Architecture & configuration**
  - Monorepo: apps vs packages, `@repo/dtos-common` / `@repo/enums-common` / `@repo/typescript-config` usage, Turborepo tasks and caching, Makefile and port allocation.
  - Env and secrets: `.dev.vars` vs `wrangler.jsonc` vars; Vite `import.meta.env` (client-exposed keys only, e.g. `VITE_*` if used); no secrets in client bundle or repo.
  - Deployment: Cloudflare Workers + Vite build output for `front-app`; `worker-api` as separate Worker; env-specific build modes (development/production).
- **Scalability**
  - Worker limits: CPU/memory and request timeouts; edge-safe code (e.g. nodejs_compat, no Node-only APIs in worker code).
  - Scaling story: static SPA assets for `front-app`, `worker-api` as stateless API; shared packages and Turborepo build caching.
  - Bottlenecks: API route design, large payloads or blocking work on the critical path; heavy client JS in React bundles.
- **Performance optimization**
  - Frontend: static asset delivery, Cloudflare caching for assets; code-splitting (`React.lazy`, route chunks), bundle size.
  - Images: lazy loading and sizing; modern formats where used; avoid layout shift (CLS).
  - worker-api: cold start impact, bundle size; timeouts on external calls if present.
  - Network: payload size, duplicate requests; link prefetch or route preloading if added; avoid unnecessary heavy client JS.
- **Security & robustness**
  - Frontend: no secrets or sensitive logic in client bundle; security headers and CSP as configured for the deployment.
  - worker-api: CORS origins and preflight, CSRF and body limits per middleware; third-party verification (e.g. Turnstile) only when implemented; service secrets only in env (`.dev.vars` / wrangler).
  - Validation and errors: Zod schemas from `@repo/dtos-common` at HTTP boundaries; consistent Hono error handling; safe logging and no sensitive data in responses or logs.
- **Maintainability & code quality**
  - Conventions: naming (camelCase, CONSTANT_CASE, PascalCase enums and CONSTANT_CASE members per AGENTS.md); Biome and TypeScript strict; consistent patterns across apps.
  - Structure: clear separation apps/packages; DTOs in `@repo/dtos-common`, routes and handlers in `worker-api`; React components and utils in `front-app/src/`.
  - Evolution: duplication, readability, testability; sustainability of shared DTOs and API surface.
- **CI, reproducibility & observability**
  - CI: `.github/workflows/ci.yml` — install, lint/format (`make check`), typecheck (`make check-types`), build; cache and lockfile handling; branch/trigger strategy.
  - Reproducibility: `make install` and lockfile, env documented (e.g. `.dev.vars.example`), build modes and deploy pipeline.
- **User experience**
  - Styling: Tailwind CSS, Vite plugin, dark mode, responsive design, mobile-first approach, consistent UI/UX patterns.

Apply these dimensions in addition to the review checklist below; structure all findings in the same plan output (Critical / Improvements / Optional).

## Steps

1. **Gather context** – Identify scope (full codebase, PR, or specific area). Request more context if insufficient. Stay within scope; note out-of-scope concerns as separate follow-up items.
2. **Read project conventions** – Review root [AGENTS.md](AGENTS.md) and relevant app AGENTS.md for architecture, naming, and patterns.
3. **Inspect key artifacts** – Open and skim the key artifacts listed above (package.json, turbo.json, wrangler.jsonc, vite.config.ts, front-app and worker-api source, CI workflow) to ground the review.
4. **Review by dimension** – Go through each of the dimensions (Architecture & configuration, Scalability, Performance optimization, Security & robustness, Maintainability & code quality, CI, reproducibility & observability, User experience) and note findings or explicit "no issues."
5. **Apply review checklist** – For each finding, confirm correctness, conventions, quality, and actionability.
6. **Compose the plan** – Group findings into Critical, Improvements, and Optional; for each item state **what**, **where**, and **why**.
7. **Verify coverage** – Ensure every dimension is addressed in the plan (with at least one finding or a one-line "no issues" note).

## Checklist

Use this checklist to track that every dimension and step is covered before submitting the plan:

- [ ] Context gathered and scope clear
- [ ] Root and app AGENTS.md consulted
- [ ] Key artifacts inspected
- [ ] **Architecture & configuration** — reviewed
- [ ] **Scalability** — reviewed
- [ ] **Performance optimization** — reviewed
- [ ] **Security & robustness** — reviewed
- [ ] **Maintainability & code quality** — reviewed
- [ ] **CI, reproducibility & observability** — reviewed
- [ ] **Styling** — reviewed
- [ ] Review checklist (correctness, conventions, quality, actionability) applied to findings
- [ ] Plan structured as Critical / Improvements / Optional with what/where/why
- [ ] Every dimension appears in the plan (finding or one-line "no issues")

## Context usage

Use the user's context effectively:

- Prefer `@code` for specific functions or classes when only part of a file is relevant.
- Use `@file` when the whole file or component matters.
- Use `@git` when reviewing commits, PRs, or recent changes.
- Use `@docs` for framework/library correctness; use `@web` only when up-to-date external info is needed.

If there isn't enough context to review meaningfully, say so and suggest which `@` references to add (e.g. `@file:path/to/module.ts`, `@git:commit-or-branch`).

## Review checklist

When reviewing, consider (for a full or deep codebase review, also apply the **Deep technical review** dimensions above):

- **Correctness**: logic, edge cases, possible bugs.
- **Conventions**: consistency with project standards (e.g. AGENTS.md, naming, patterns).
- **Quality**: security, performance, or maintainability where relevant.
- **Actionability**: every suggestion must be clear and implementable—no vague advice.
- **Trade-offs**: when a suggestion involves trade-offs (e.g. performance vs readability), state them briefly so the author can decide.
- **Scope**: limit findings to the review scope; call out out-of-scope concerns as separate follow-up tasks rather than blocking the current plan.

## Output format

Respond with a **plan** only (no implementation unless the user explicitly asks):

1. **Critical** – must-fix issues (bugs, security, broken behavior).
2. **Improvements** – worthwhile changes (clarity, robustness, consistency).
3. **Optional** – nice-to-haves (style, minor refactors). Prefix with **Nit:** when the item is pure polish so the author knows it's non-blocking.

For each item give: **what** to change, **where** (file and area), and **why**. Keep items short and scannable. For deep reviews, address every dimension above—if a dimension has no findings, say so in one line (e.g. "Scalability: no issues identified").
