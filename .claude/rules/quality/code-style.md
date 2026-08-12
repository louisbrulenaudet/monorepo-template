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
- Lint and format run as a whole-repo OXC pass from the root - never `cd` into a package and run `oxlint .` (breaks context-aware Tailwind rules). See **Scoping** in root `AGENTS.md`.
