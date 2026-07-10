---
paths:
  - "**/*.test.ts"
  - "**/*.spec.ts"
  - "**/tests/**"
  - "**/vitest.config.ts"
  - "**/vitest.evals.config.ts"
---

# Testing Rules

Tests run on **Vitest** with those conventions:

- Put unit tests under the app or package at a `tests/` directory that mirrors the source area.
- Keep Vitest tests deterministic and avoid assertions that depend on test order.
- Test at the **trust boundaries** the app actually enforces: Zod/valibot schemas, constrained value sets, the auth guard, idempotency dedup, and route behavior (status codes, fail-closed `503`s). Prefer asserting observable behavior over internals.
- `any` is allowed **only** in `*.test.ts` / `*.spec.ts` (`typescript/no-explicit-any` is relaxed there) — do not reach for it in source to make a test pass.
- Keep other Oxc rules satisfied in tests too (block statements, no floating promises — `await` or `void`). Filenames stay kebab-case.

## Discipline

- **Never weaken source to make a test pass** and never silence a failing test (no blanket skips, no loosened types). Fix the cause, or stop and report the exact command and output. See [guardrails.md](guardrails.md).
- When you change a wire shape or constrained value set, update the tests that assert it in the **same** change.
- Before finishing, run the affected workspace's tests plus `make ci` (see [code-style.md](code-style.md)).
