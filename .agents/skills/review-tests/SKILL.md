---
name: review-tests
description: "Test-suite value review: finds tests that re-assert source, duplicate stronger proof, couple to implementation, or keep test-only production seams alive, and returns a delete / tighten / move plan with per-candidate evidence. USE WHEN: user runs /review-tests or explicitly asks to audit or prune tests. DO NOT USE WHEN: writing or changing a test (the quality/testing rule gates that) or reviewing Vitest configuration (/review-vitest)."
disable-model-invocation: true
context: fork
background: true
model: opus
effort: high
---

# Review tests

Audit whether the repo's tests earn their maintenance cost. Your reply must be a **plan of suggested changes** with evidence per candidate - concise, actionable, structured. Optimize for confidence, not deletion count: a wrongly deleted test removes a guard nobody notices is missing.

## Invocation

Text after the slash command narrows scope: a path (`apps/worker-api/tests/middlewares`), a workspace (`front-app`), or `diff` - test files changed against `main`, including uncommitted and untracked ones (`git diff --name-only main -- '*/tests/*'` plus `git ls-files --others --exclude-standard -- '*/tests/*'`). Default: every suite under `apps/*/tests/` and `packages/*/tests/`.

## Ground truth (mandatory)

1. Read [.claude/rules/quality/testing.md](../../../.claude/rules/quality/testing.md) in full before judging anything (Cursor mirror: `.cursor/rules/quality/testing.mdc`). Its **authoring gate** and **junk patterns** are the value bar; this skill adds only the audit procedure and never restates them.
2. Read root [AGENTS.md](../../../AGENTS.md), the `AGENTS.md` of each workspace in scope, and the test rules the testing rule links to.
3. When a test appears to exercise library behavior (Hono, Zod, TanStack, workerd, React), check the installed types or source under `node_modules`, or the documentation MCP, before calling it a library test.

## Discovery (read-only)

Never edit files, never run `git stash` / `checkout` / `reset`, never leave a watcher running. Running one suite (`pnpm --filter=<ws> exec vitest run tests/<path>`) is allowed; if the sandbox blocks it, say so and reason statically.

Start from these sweeps, then read each hit in full:

- `@internal` exports under `apps/*/src` and `packages/*/src`, and every caller of each - a seam whose only callers are tests is a candidate together with the tests that keep it alive.
- Tests that import a `@repo/*` helper and assert on it directly while the owning package has its own suite.
- Expected literals (`toBe`, `toEqual`, `toContain`) that appear verbatim in the module under test.
- `not.` assertions - check what else would satisfy them.
- One contract asserted in both a unit suite and a route or boundary suite.

For each candidate, read the complete test, its production owner, the owner's non-test callers, and the sibling tests covering the same owner, then `git log --follow --format='%h %s' -- <test>` for why it exists.

## Retention bar

Keep a test that independently enforces:

- a wire contract - `@repo/dtos-common` shape, status code, header, route path;
- security behavior - CORS / CSRF fail-closed, correlation-id opacity, client-safe errors (skill `privileged-legal-data`);
- a config default, a fail-closed branch, or an architecture boundary;
- call ordering, when the order is observable;
- a regression with a credible failure mode.

A source literal is worth keeping when the literal **is** the contract (a header name, a route path, an error message a client reads) and nothing else pins it. UI copy restated from a lookup table is not a contract: it changes only by product decision, so the test detects nothing and only forces a lockstep edit. Static or slow is never a deletion reason. A test that resembles implementation may still be the only guard - prove otherwise before recommending deletion. A retained test that fails on the baseline is a possible product bug: report it under Critical and never propose deleting it.

## Candidate evidence

Record every field before recommending an edit. A missing field makes the candidate **not ready** - list it under Optional as "needs evidence", never as a deletion.

- **Test** - file and exact test name.
- **Detects** - the smallest source change that is a real bug and makes it fail, or "none" when only behavior-preserving changes break it.
- **Seam callers** - non-test callers of the export or helper it exercises.
- **Stronger proof** - the remaining test that owns the contract (`file › test`), or why no proof is needed.
- **History** - why the test or seam was added.
- **Unlocks** - production or test-support code the change lets you delete.
- **Risk + command** - what could regress, and the focused command that validates the edit.

## Verdicts

- **Delete** - a junk pattern is confirmed and a stronger proof exists, or none is needed. Delete the seam it kept alive in the same item, with no alias or re-export left behind.
- **Tighten** - the contract is real but the assertion is weak: replace a negative, truthiness, or format-only check with the exact expected value.
- **Move to owner** - the contract belongs to another workspace's suite (a `@repo/*` package) that does not cover it yet.
- **Keep** - a false positive; name the retention-bar item it meets.

Never propose a replacement test that restates the same implementation. Prefer net-negative production LOC.

## Output format

1. **Critical** - retained tests that fail on the baseline; weak assertions guarding a security contract (a negative check that a regression would still pass).
2. **Improvements** - high-confidence delete / tighten / move items, grouped into one coherent batch per owning workspace. Each item: verdict, the exact edit to tests and seams, and the evidence fields.
3. **Optional** - medium-confidence items and "needs evidence" candidates. Prefix pure polish with **Nit:**.
4. **Retained false positives** - candidates the sweeps surfaced that stay, each with its retention reason.
5. **Validation** - for whoever applies the plan: each focused `vitest run`; `pnpm lint:agent`; `pnpm knip` and `pnpm knip:production` (a removed seam must not leave a dangling export); `pnpm run ci`; `git diff --numstat` reported as production versus tests. A tightened assertion is proven by breaking its owner temporarily and watching the test fail.

Prefer a few well-evidenced items over a long speculative list. Read-only review: produce the plan only; implement nothing unless explicitly asked afterwards.
