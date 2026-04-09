# Review security command

Run a **security-focused** review: HTTP security headers, CSP, bot protection (when implemented), CORS/CSRF, input validation, secret management, dependency vulnerabilities, and error information leakage. Your reply must be a **plan of suggested changes**: concise, actionable, and structured—not only prose.

## Cursor command usage

This file is a [Cursor custom command](https://docs.cursor.com/context/commands): plain Markdown in `.cursor/commands/`. When the user runs `/review-security` in chat, this content is sent as the prompt.

- **Parameters:** Any text after `/review-security` is scope—e.g. `/review-security headers only`, `/review-security worker-api`—narrow accordingly. If none given, assume full security review (`front-app` build + `worker-api` + env and deps).

This command is project-scoped and works with @ mentions and Rules. For a full review use `/review` instead.

## Best practices alignment

- **Headers** — CSP with nonces or strict-dynamic where needed; X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy; HSTS in production where applicable (often platform + `hono/secure-headers` on API).
- **Input validation** — All external input (API bodies, query params, path params) validated with Zod schemas from `@repo/dtos-common` and `@hono/zod-validator` where applicable; use `.strict()` on schemas when appropriate; reject unknown keys; sanitize for context (HTML, URL, etc.) where output.
- **Secrets** — Never in repo or client bundle; only in `.dev.vars` or wrangler env; no logging or error messages that include secrets.
- **Bot protection** — Turnstile (or equivalent) on sensitive endpoints **when implemented**; token verified server-side before any processing; no bypass for "trusted" clients without verification.
- **CORS and CSRF** — CORS allowlist (no wildcard in production); preflight handled; state-changing `/api/*` requests protected (e.g. `hono/csrf` with same-site / origin rules per AGENTS.md patterns).
- **Errors and logging** — No stack traces or internal paths in client-facing responses; safe logging (no sensitive data); consistent Hono error handling (`HTTPException`, `onError`).

Align with root [AGENTS.md](AGENTS.md) and [apps/worker-api/AGENTS.md](apps/worker-api/AGENTS.md) for env and validation patterns.

## Deep technical review

Conduct a security-only review. Inspect the following and call out violations or improvements.

### HTTP security headers

- **Artifacts:** [apps/worker-api/src/index.ts](apps/worker-api/src/index.ts) (`secureHeaders` and middleware order); deployment headers for [apps/front-app/](apps/front-app/) (Cloudflare + Vite output) when relevant.
- **Checks:** CSP: default-src and script-src restrictive where configured; inline scripts only with nonce or strict-dynamic if required; no unsafe-inline/unsafe-eval unless justified and documented. X-Frame-Options: DENY or SAMEORIGIN. X-Content-Type-Options: nosniff. Referrer-Policy set (e.g. strict-origin-when-cross-origin). Permissions-Policy restricts unnecessary features (camera, mic, etc.). HSTS in production where applicable. Headers applied to API responses; static/HTML shell follows platform and app config.

### Turnstile and bot protection (when present)

- **Artifacts:** worker-api routes and utils **if** Turnstile or similar is added; [apps/worker-api/src/index.ts](apps/worker-api/src/index.ts).
- **Checks:** Widget on sensitive form; token sent with request. Server-side verification before business logic. Verification failure returns generic error; no bypass for missing token. Secret only in env; not in client or logs.

### CORS and preflight

- **Artifacts:** [apps/worker-api/src/index.ts](apps/worker-api/src/index.ts) (CORS middleware), [apps/worker-api/wrangler.jsonc](apps/worker-api/wrangler.jsonc).
- **Checks:** `Access-Control-Allow-Origin`: allowlist of known origins (e.g. front-app dev URL); no `*` in production. Methods and headers allow only what is needed. Preflight (OPTIONS) handled and cached if appropriate. Credentials: if cookies/auth used, allowlist and `Allow-Credentials` aligned.

### Input validation

- **Artifacts:** [packages/dtos-common/src/](packages/dtos-common/src/) (Zod schemas), [apps/worker-api/src/routes/](apps/worker-api/src/routes/), any handler accepting input.
- **Checks:** Every request body, query, and path segment validated with Zod (e.g. `zValidator`). Schemas use `.strict()` where appropriate. Type coercion and defaults are safe. Email, URLs, and free text: format and length limits; no raw input passed to external services without validation.

### Secrets and environment

- **Artifacts:** [apps/worker-api/.dev.vars.example](apps/worker-api/.dev.vars.example), [apps/worker-api/wrangler.jsonc](apps/worker-api/wrangler.jsonc), [apps/front-app/wrangler.jsonc](apps/front-app/wrangler.jsonc), code reading `import.meta.env` / Worker bindings.
- **Checks:** No API keys or secrets in repo or in client bundle. Secrets only in `.dev.vars` or wrangler secrets / env. `.dev.vars` in `.gitignore`; `.dev.vars.example` has placeholders only. No secret in logs. No secret in error response body or headers.

### Error handling and information leakage

- **Artifacts:** [apps/worker-api/src/index.ts](apps/worker-api/src/index.ts) (`onError`, `HTTPException`), route handlers.
- **Checks:** Client-facing responses: generic messages for unexpected errors; no stack traces, file paths, or internal codes in production. Logging: detail server-side only; no sensitive data (PII, tokens) in logs. Validation errors: field-level messages safe for clients (no injection risk).

### Dependencies and supply chain

- **Artifacts:** Root and app [package.json](package.json), pnpm-lock.yaml, [.github/workflows/ci.yml](.github/workflows/ci.yml).
- **Checks:** Run (or assume) `pnpm audit`; no high/critical unmitigated vulnerabilities. Dependabot or similar for dependency updates. If CI runs audit, it fails on high/critical.

### Rate limiting and abuse

- **Artifacts:** [apps/worker-api/src/index.ts](apps/worker-api/src/index.ts), sensitive routes when added.
- **Checks:** Sensitive endpoints: rate limiting (per IP or token) when needed. Cloudflare rate limiting or in-worker logic. Body size limits set (e.g. `bodyLimit`).

### Well-known and transparency

- **Artifacts:** `public/.well-known/` or `security.txt` under [apps/front-app/](apps/front-app/) **if** present.
- **Checks:** security.txt has correct Contact and optional Expires; no sensitive data.

### Anti-patterns to flag

- CSP with unsafe-inline/unsafe-eval without clear justification.
- CORS `Allow-Origin: *` in production.
- Turnstile token not verified or verified after processing (when Turnstile is used).
- Request body parsed without Zod validation at the boundary.
- Secrets in code, client bundle, or logs.
- Stack traces or internal paths in API error responses.
- No rate limiting on abuse-prone endpoints when exposed publicly.
- High/critical dependency vulnerabilities unaddressed.

## Steps

1. **Gather scope** — Full security or specific area (headers, CORS, validation, secrets, deps). Default to full.
2. **Read conventions** — AGENTS.md for env, validation, and error handling.
3. **Inspect security headers** — worker-api middleware; CSP and other headers.
4. **Inspect bot protection** — When implemented: frontend token submission; worker-api verification order.
5. **Inspect CORS** — worker-api middleware; allowlist and preflight.
6. **Inspect validation** — DTOs in `@repo/dtos-common` and route usage; strict and safe usage.
7. **Inspect secrets and errors** — Env usage, error responses, logging; no leakage.
8. **Consider dependencies and rate limiting** — pnpm audit; rate limit on sensitive endpoints.
9. **Compose plan** — Critical / Improvements / Optional; each item: **what**, **where**, **why**. One-line "no issues" per sub-area if none.

## Checklist

- [ ] Scope clear
- [ ] AGENTS.md consulted for env and validation
- [ ] HTTP security headers (CSP, X-Frame-Options, etc.) reviewed
- [ ] Optional Turnstile verification reviewed when present
- [ ] CORS and preflight reviewed
- [ ] Input validation (shared DTOs, zValidator) reviewed
- [ ] Secrets and env usage reviewed; no leakage in logs/response
- [ ] Error handling and client-facing messages reviewed
- [ ] Dependencies (audit) and rate limiting considered
- [ ] Plan structured as Critical / Improvements / Optional with what/where/why

## Context usage

- Use `@file` for worker-api index.ts, route files, packages/dtos-common, wrangler.jsonc.
- Use `@code` for header values, validation schemas, or error handling when suggesting changes.
- Use `@docs` or `@web` for CSP, CORS, or Turnstile best practices.

If context is insufficient, suggest which files or @ references to add.

## Review checklist

- **Correctness:** Header and CORS config are valid; validation covers all inputs.
- **Conventions:** Aligns with AGENTS.md (Zod DTOs, Hono, env).
- **Quality:** Defense in depth; validation at the edge.
- **Actionability:** Every suggestion is implementable (e.g. "tighten CSP", "use .strict() on schema").
- **Trade-offs:** Note any (e.g. CSP strictness vs third-party scripts).
- **Scope:** Security only; defer performance or config to their reviews.

## Output format

Respond with a **plan** only (no implementation unless the user asks):

1. **Critical** – Must-fix (secrets exposed, CORS `*`, missing validation, stack trace in response, high/critical vuln).
2. **Improvements** – Worthwhile (stronger CSP, rate limiting, Referrer-Policy, stricter Zod).
3. **Optional** – Nice-to-haves (security.txt, audit in CI). Prefix with **Nit:** for non-blocking polish.

For each item: **what** to change, **where** (file/area), and **why**. If a sub-area has no findings, state it in one line.
