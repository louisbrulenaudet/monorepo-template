---
id: tests
summary: whether tests earn their cost - tests that re-assert source, duplicate stronger proof, couple to implementation, or keep test-only seams alive - and whether security-relevant contracts have a guard
model: opus
---

# Tests

Audit whether the repo's tests earn their maintenance cost, and whether the contracts that matter have one. Optimize for confidence, not deletion count: a wrongly deleted test removes a guard nobody notices is missing.

## Ground truth

- Rule [quality/testing](../../../../.claude/rules/quality/testing.md), read in full before judging anything: its **authoring gate** and **junk patterns** are the value bar; this file adds only the audit procedure and never restates them.
- Rules [tests/hono-workers](../../../../.claude/rules/tests/hono-workers.md), [tests/front-react](../../../../.claude/rules/tests/front-react.md), [quality/knip](../../../../.claude/rules/quality/knip.md) (`@internal` seams); [packages/vitest-config/AGENTS.md](../../../../packages/vitest-config/AGENTS.md); skill `front-vitest` for DOM / RTL / Router harness depth.
- When a test appears to exercise library behavior (Hono, Zod, TanStack, workerd, React), check the installed types or source under `node_modules`, or the documentation MCP, before calling it a library test.

## Scope

A path (`apps/worker-api/tests/middlewares`), a workspace (`front-app`), or `diff` - test files changed against `main`, uncommitted and untracked included (`git diff --name-only main -- '*/tests/*'` plus `git ls-files --others --exclude-standard -- '*/tests/*'`). Default: every suite under `apps/*/tests/` and `packages/*/tests/`.

## Probe

One suite at a time: `pnpm --filter=<ws> exec vitest run tests/<path>` (if the sandbox blocks it, say so and reason statically). `git log --follow --format='%h %s' -- <test>`. Never `git stash` / `checkout` / `reset`, never leave a watcher running.

## Axes

- **Discovery sweeps** - start from these, then read each hit in full:
  - `@internal` exports under `apps/*/src` and `packages/*/src`, and every caller of each - a seam whose only callers are tests is a candidate together with the tests that keep it alive;
  - tests that import a `@repo/*` helper and assert on it directly while the owning package has its own suite;
  - expected literals (`toBe`, `toEqual`, `toContain`) that appear verbatim in the module under test;
  - `not.` assertions - check what else would satisfy them;
  - one contract asserted in both a unit suite and a route or boundary suite.
  For each candidate, read the complete test, its production owner, the owner's non-test callers, and the sibling tests covering the same owner, then its `git log`.
- **Retention bar** - keep a test that independently enforces: a wire contract (`@repo/dtos-common` shape, status code, header, route path); security behavior (CORS / CSRF fail-closed, request id minted per request and never taken from the client, client-safe errors); a config default, a fail-closed branch, or an architecture boundary; observable call ordering; a regression with a credible failure mode. A source literal is worth keeping when the literal **is** the contract (a header name, a route path, an error message a client reads) and nothing else pins it; UI copy restated from a lookup table is not. Static or slow is never a deletion reason. A retained test that fails on the baseline is a possible product bug: Critical, never a deletion.
- **Missing guards** - each security-relevant fail-closed branch has one test at its owning boundary (empty `CORS_ORIGINS` → 503 outside `dev`, foreign origin refused on unsafe methods, validation failure envelope, body limit). Once the surfaces exist: a bad and a replayed webhook signature rejected; a duplicate queue delivery producing one side effect; a second tenant unable to read the first's data; an MCP tool refusing a resource the requester cannot access. Name the owning suite; never propose a test that restates implementation.
- **Candidate evidence** - record every field before recommending an edit; a missing field makes the candidate **not ready** (Optional, "needs evidence", never a deletion): **Test** (file and exact name), **Detects** (the smallest real-bug source change that fails it, or "none"), **Seam callers** (non-test callers of what it exercises), **Stronger proof** (`file › test` that owns the contract, or why none is needed), **History** (why it was added), **Unlocks** (code the change lets you delete), **Risk + command** (what could regress, and the focused command that validates the edit).
- **Verdicts** - **Delete** (junk pattern confirmed and stronger proof exists or none is needed; delete the seam it kept alive in the same item, no alias left); **Tighten** (real contract, weak assertion: replace a negative, truthiness, or format-only check with the exact expected value); **Move to owner** (belongs to another workspace's suite that does not cover it yet); **Keep** (false positive; name the retention-bar item it meets). Prefer net-negative production LOC.

## Critical when

A retained test failing on the baseline; a weak assertion guarding a security contract (a negative check a regression would still pass); a security-relevant fail-closed branch with no test at all.

## Overlaps

This domain owns testability for the whole review. Vitest configuration and pool setup belong to `review-stack vitest`; dead production code outside test seams to `simplicity`.

## Accepted

- The authoring gate and junk-pattern list: rule [quality/testing](../../../../.claude/rules/quality/testing.md).

## Extra output

Improvements are grouped into one coherent batch per owning workspace, each item with its verdict, the exact edit to tests and seams, and the evidence fields. Then:

```text
Retained false positives:
- <file> › <test> - <retention-bar item it meets>
Validation:
- <each focused vitest run>; pnpm lint:agent; pnpm knip and pnpm knip:production (a removed seam must not leave a dangling export); pnpm run ci; git diff --numstat reported as production vs tests. A tightened assertion is proven by breaking its owner temporarily and watching it fail.
```
