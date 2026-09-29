---
id: code-quality
summary: TypeScript discipline, naming, contract and schema style, error handling consistency, comments, idioms the lint cannot see
model: sonnet
---

# Code quality

Does the source follow the repo's code rules where the linter cannot tell - type precision, naming, schema style, error paths, comments - so that the next reader and the next agent get it right?

## Ground truth

- Rules: [quality/code-style](../../../../.claude/rules/quality/code-style.md), [quality/naming](../../../../.claude/rules/quality/naming.md), [quality/comments](../../../../.claude/rules/quality/comments.md), [contracts/contracts](../../../../.claude/rules/contracts/contracts.md), [backend/hono-gateway](../../../../.claude/rules/backend/hono-gateway.md) (Errors, Typing & structure), [frontend/react](../../../../.claude/rules/frontend/react.md), [frontend/tanstack-query](../../../../.claude/rules/frontend/tanstack-query.md).
- Guardrails [core/guardrails](../../../../.claude/rules/core/guardrails.md), "Do not paper over failures".
- Skill `workers-best-practices` (anti-patterns: hand-written `Env`, `as unknown as T`, destructuring `ctx`); skill `react-doctor` for React diagnostics.

## Scope

`apps/*/src/**` and `packages/*/src/**` (`.ts`, `.tsx`), `hooks/**`. A path, workspace, or `diff` focus narrows to those files; with `diff`, judge only changed lines plus the function they sit in.

## Probe

`pnpm types` then `pnpm lint:agent` (type-aware lint needs the generated types; read only the `file:line:col` lines), `pnpm react-doctor --verbose`, `pnpm --filter=worker-api run routes` (anonymous middleware shows as `[middleware]`).

## Axes

- **Type precision**: `unknown` only at I/O boundaries, narrowed by a schema; no cast laundering (`as unknown as T`, widening to `object` / `Record` and asserting back, `any` swapped for `unknown` + assertion); inference or `satisfies` over annotations restating the inferred type; `Env` only from generated types, never hand-written; `HonoEnv<Env>` for app typing.
- **Suppressions**: only `oxlint-disable-next-line <rule> -- <reason>` or `@ts-expect-error <reason>`; no blanket disable, no `@ts-ignore`, no loosened config to go green.
- **Naming**: per rule `quality/naming` (casing follows the file kind; Oxc enforces what it can) - check what the linter cannot: names that lie about behavior, `as const` value sets instead of `export enum`, string literals where an `@repo/enums-common` value exists.
- **Contracts and schemas**: schema/type naming and placement per rule `contracts/contracts` (no `Type` suffix, types at the bottom, zod/mini where it applies, one unknown-keys policy per file); types inferred from schemas, never hand-written twins that can drift.
- **Errors**: rejections throw `HTTPException(status, { message })`; nothing builds the `{ error, requestId }` envelope by hand except `jsonMethodNotAllowed`; no `catch` that only rethrows or logs and swallows; logs are objects, `console.error` only for real failures.
- **Hono and React idioms**: every middleware is a named function expression; broad scope with `except` / `some` / `every` carve-outs; `#/*` imports, never `@/`; no component defined inside another; no fetch in `useEffect`; `queryOptions` paired with each service call.
- **Comments**: per rule `quality/comments` - no comment restating code, no banners, no stale TODOs; a "safe because..." or "cannot happen" comment whose claim the code does not actually guarantee is a finding; `temp` / `hack` / `legacy` / `workaround` code gets a closer read.
- **Readability**: `max-lines-per-function` is lint-enforced at 100; beyond that, flag only a function whose length hides a second responsibility, with the split named.

## Critical when

A cast or suppression that hides a real type error at a trust boundary; a hand-built error envelope that drops `requestId` or leaks internals; a comment asserting a safety property the code does not hold; a hand-written `Env` that diverges from `cloudflare.config.ts`.

## Overlaps

Dead code, duplication, one-caller layers, and reinvented helpers belong to `simplicity`; testability to `tests`; error-body leakage and validation at trust boundaries to `security`; OXC and TypeScript configuration to `review-stack oxc` / `review-stack typescript`; formatting and import order are oxfmt's (never a finding).

## Accepted

- Strict flag set and presets: rule [quality/typescript-config](../../../../.claude/rules/quality/typescript-config.md).
- Lint rule selection and severities: rule [quality/lint-config](../../../../.claude/rules/quality/lint-config.md).
