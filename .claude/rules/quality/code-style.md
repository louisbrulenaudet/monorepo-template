---
paths:
  - "apps/**/*.{ts,tsx}"
  - "packages/**/*.ts"
---

# Code Style

OXC is the source of truth: `.oxlintrc.json` (lint) and `.oxfmtrc.json` (format). Do not restyle to match personal habits - match the surrounding file and let `oxfmt` decide layout. These rules run with `denyWarnings: true` / `maxWarnings: 0`, so any warning fails CI. Do not silence a rule, add a blanket ignore, or cast through `any` / `as unknown` to clear an error - fix the cause (see [guardrails.md](../core/guardrails.md)).

## Discipline

- Keep route/tool handlers thin: validate at the boundary, delegate I/O to a client or service module, then map the response. Business logic does not belong inline in the handler.
- Prefer native type inference (see [type-inference.md](../contracts/type-inference.md)) over hand-written shapes.
- `unknown` belongs only at an I/O boundary: a Zod parser, a type predicate's subject, or an error/`cause` handler. Parse there and pass the domain type onward - do not thread `unknown` / `object` / `Record<string, unknown>` through signatures or re-narrow with ad-hoc `typeof` chains.
- Do not annotate a literal wider than it is (`const handlers: Record<string, Handler> = { start }` drops the known key). Keep inference or use `satisfies`.
- An unsafe assertion that must stay carries `// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- <invariant that makes it true>`.
- Lint and format run as a whole-repo OXC pass from the root - never `cd` into a package and run `oxlint .` (breaks context-aware Tailwind rules). See **Scoping** in root `AGENTS.md`.
- Inline suppressions use the `oxlint-*` form only (`// oxlint-disable-next-line <rule>` with a reason). `.oxlintrc.json` sets `respectEslintDisableDirectives: false`, so `eslint-disable*` comments are ignored by the linter and, via `reportUnusedDisableDirectives: "error"`, any stray one fails CI.
