---
name: review-simplicity
description: "Over-engineering review: finds what to delete - speculative abstractions, single-caller layers, reinvented helpers or platform APIs, needless dependencies, defensive code the types rule out - plus a ledger of `ceiling:` shortcuts. One tagged line per finding and a net line count. USE WHEN: user runs /review-simplicity or explicitly asks to find bloat or over-engineering in a diff or the repo. DO NOT USE WHEN: hunting correctness bugs (/code-review), security (/review-security), performance (/review-performance), or test value (/review-tests)."
disable-model-invocation: true
context: fork
background: true
model: sonnet
effort: medium
---

# Review simplicity

Find what the code does not need. The best outcome of this review is a shorter diff with identical behavior. Your reply must be a **plan of suggested changes** - one line per finding, actionable, structured. Optimize for confidence, not cut count: a wrongly deleted guard is a bug nobody notices is missing.

## Invocation

Text after the slash command narrows scope:

- none (default) - files changed against `main`, including uncommitted and untracked ones: `git diff --name-only main...HEAD`, `git diff --name-only`, and `git ls-files --others --exclude-standard`;
- a path or workspace (`apps/worker-api/src/middlewares`, `front-app`);
- `all` - every source file under `apps/*/src`, `packages/*/src`, and `hooks/`, ranked biggest cut first.

## Ground truth (mandatory)

1. Read [.claude/rules/quality/simplicity.md](../../../.claude/rules/quality/simplicity.md) in full before judging anything (Cursor mirror: `.cursor/rules/quality/simplicity.mdc`). Its ladder, **Do not generate** list, and **Never simplify away** list are the bar; this skill adds only the review procedure and never restates them.
2. Read [.claude/rules/quality/comments.md](../../../.claude/rules/quality/comments.md), root [AGENTS.md](../../../AGENTS.md), and the `AGENTS.md` of each workspace in scope.
3. Run `pnpm knip:agent` once and use its output for unused files, exports, and dependencies instead of re-deriving them. If the sandbox blocks it, say so and reason statically.
4. Before tagging something `native` or `reuse`, confirm the replacement exists: the platform API in the Workers runtime or target browsers, the helper in the named `@repo/*` package, the feature in the installed dependency version under `node_modules`.

## Evidence bar

- A "one implementation", "one caller", or "nobody sets it" claim needs a grep of every caller across `apps/`, `packages/`, and `tests/`. Record the count.
- Never flag Zod validation at a trust boundary, the owning test of a contract, sensitive-data handling, fail-closed branches, or anything a rule under `.claude/rules/` requires. When a cut would cross one, it is not a finding.
- A finding changes how the code does something, never what it does. If behavior would change, it belongs in `/code-review`, not here.

## Tags

- `delete:` dead code, unused flexibility, speculative feature, a comment that fails `comments.md`. Replacement: nothing.
- `reuse:` re-implements something already in the repo. Name the existing helper and its path.
- `native:` code or a dependency doing what the platform or an installed dependency already does. Name the API or feature.
- `yagni:` an abstraction with one implementation, a layer with one caller, config nobody sets. Inline it until a second one exists.
- `shrink:` same logic in fewer, clearer lines. Show the shorter form; never a nested ternary or a dense one-liner.

## Ceilings ledger

List every deliberate shortcut: `grep -rnE '(//|#) ?ceiling:' apps packages hooks`, skipping `node_modules` and build output. One row per marker: `<file>:L<n>: <what was simplified>. ceiling: <limit>. revisit: <trigger>.` Tag a marker that names no trigger `no-trigger` - those are the ones that rot.

## Output format

1. **Critical** - a new dependency added for what a few lines or the platform do; a parallel implementation of a shared `@repo/*` contract or helper.
2. **Improvements** - high-confidence findings, one line each, biggest cut first: `<file>:L<n>: <tag> <what>. <replacement>.`
3. **Optional** - medium-confidence findings, and candidates missing evidence (say which). Prefix pure polish with **Nit:**.
4. **Ceilings** - the ledger, then `<N> markers, <M> no-trigger.`
5. **Score** - `net: -<N> lines, -<M> deps possible.` If nothing survives the evidence bar: `Lean already.`

Read-only review: produce the plan only; implement nothing unless explicitly asked afterwards. Whoever applies it validates with `pnpm lint:agent`, `pnpm knip`, `pnpm knip:production`, and `pnpm run ci`.
