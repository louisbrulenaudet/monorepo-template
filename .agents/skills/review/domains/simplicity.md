---
id: simplicity
summary: "what to delete - speculative abstractions, single-caller layers, reinvented helpers or platform APIs, needless dependencies, defensive code the types rule out, dead code, plus the ceiling: ledger"
model: sonnet
---

# Simplicity

Find what the code does not need. The best outcome is a shorter diff with identical behavior. Optimize for confidence, not cut count: a wrongly deleted guard is a bug nobody notices is missing.

## Ground truth

- Rule [quality/simplicity](../../../../.claude/rules/quality/simplicity.md), read in full before judging anything: its ladder, **Do not generate** list, and **Never simplify away** list are the bar; this file adds only the review procedure and never restates them.
- Rules [quality/comments](../../../../.claude/rules/quality/comments.md) and [quality/knip](../../../../.claude/rules/quality/knip.md).

## Scope

- no focus - files changed against `main`, including uncommitted and untracked ones: `git diff --name-only main...HEAD`, `git diff --name-only`, and `git ls-files --others --exclude-standard`;
- a path or workspace (`apps/worker-api/src/middlewares`, `front-app`);
- `all` - every source file under `apps/*/src`, `packages/*/src`, and `hooks/`, ranked biggest cut first.

## Probe

`pnpm knip:agent` once - use its output for unused files, exports, and dependencies instead of re-deriving them; if the sandbox blocks it, say so and reason statically. `grep -rnE '(//|#) ?ceiling:' apps packages hooks` (skip `node_modules` and build output). The git commands in Scope.

## Axes

- **Existence**: speculative features, options nobody sets, extension points, stubs, and TODO scaffolding (`delete:`).
- **Reuse**: re-implementations of a `@repo/*` helper, schema, or pattern already in the repo (`reuse:`) - name the existing one and its path.
- **Platform and installed deps**: code or a dependency doing what the Workers runtime, the browser, Hono, Zod, or TanStack already do (`native:`) - confirm the replacement exists in the runtime or target browsers, or in the installed version under `node_modules`, before tagging.
- **Abstraction**: an interface, factory, generic, or wrapper with one implementation or one caller; config that never changes (`yagni:`).
- **Defensive code**: null checks on non-nullable values, re-parsing data a schema already parsed, `try`/`catch` that only rethrows or logs and swallows (`delete:`).
- **Dead code and duplication**: knip-reported files, exports, and deps; copy-pasted blocks that one existing helper covers; commented-out code (`delete:` / `reuse:`).
- **Same logic, fewer lines**: `shrink:` - show the shorter form; never a nested ternary or a dense one-liner.

Evidence bar, on top of the reviewer contract:

- A "one implementation", "one caller", or "nobody sets it" claim needs a grep of every caller across `apps/`, `packages/`, and `tests/`. Record the count.
- Never flag Zod validation at a trust boundary, the owning test of a contract, sensitive-data handling, fail-closed branches, or anything a rule under `.claude/rules/` requires.
- A finding changes how the code does something, never what it does. If behavior would change, hand it off to `code-quality` or `security`, or leave it for `/code-review`.

## Critical when

A new dependency added for what a few lines or the platform already do; a parallel implementation of a shared `@repo/*` contract or helper.

## Overlaps

This domain owns dead code, duplication, and reinvented helpers for the whole review. Test pruning belongs to `tests`; behavior-changing fixes to `code-quality` / `security`.

## Accepted

- Deliberate shortcuts carrying a `ceiling:` marker with a revisit trigger: rule [quality/simplicity](../../../../.claude/rules/quality/simplicity.md).
- Knip overrides and their rationale: rule [quality/knip](../../../../.claude/rules/quality/knip.md).

## Extra output

Findings use one line each: `<file>:L<n>: <tag> <what>. <replacement>.` with the tag as the slug prefix (`delete:`, `reuse:`, `native:`, `yagni:`, `shrink:`), biggest cut first. Then:

```text
Ceilings:
- <file>:L<n>: <what was simplified>. ceiling: <limit>. revisit: <trigger>.   (tag `no-trigger` when the marker names none)
<N> markers, <M> no-trigger.
Score: net: -<N> lines, -<M> deps possible.   (or "Lean already." when nothing survives the evidence bar)
```

Whoever applies the plan validates with `pnpm lint:agent`, `pnpm knip`, `pnpm knip:production`, and `pnpm run ci`.
