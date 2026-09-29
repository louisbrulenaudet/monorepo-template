---
name: review
description: "Code and design review of this repo by domain - architecture, ci, code-quality, configuration, performance, security, seo, simplicity, tests, ui: one parallel reviewer subagent per selected domain, verified findings, one consolidated plan in chat with IDs to answer. USE WHEN: user runs /review, optionally with domains (`/review security,ci`) and a focus (a path, a workspace, `diff`). DO NOT USE WHEN: checking a third-party tool's configuration against its docs (/review-stack), hunting correctness bugs in a diff (/code-review), a full security audit or pen test (/security-audit), or implementing features."
argument-hint: "[all|<domain>[,<domain>...]] [focus]"
disable-model-invocation: true
---

# Review

Review the repo, one domain per subagent, and give the owner a verified, prioritized plan with the smallest effective fix per item. A deviation from a checklist is not a finding until it has a repo location, a source, and a concrete consequence.

One domain or ten, the process is the same: one reviewer per domain, in parallel, then one verification pass and **one reply**. It writes no files.

## Registry

Each `domains/<id>.md` is one domain. Its frontmatter is the registry - `id`, `summary`, `model`, optional `applies_when` - and its body is what the reviewer follows: `## Ground truth`, `## Scope`, `## Probe`, `## Axes`, `## Critical when`, `## Overlaps`, `## Accepted`, optional `## Extra output`. The contract every reviewer follows is [reviewer.md](reviewer.md).

**Adding a domain** = adding one `domains/<id>.md` with that frontmatter and those sections. Nothing else lists domains.

Read only the frontmatter here (Glob `domains/*.md`, first lines of each); each reviewer reads its own domain file in full.

## Selector

`$ARGUMENTS`: the first word is the selector, the rest is the **focus**.

- none or `all` → every domain.
- a domain `id`, or ids comma-separated (`security,ci`) → those.
- anything else → print the `id` / `summary` table and stop.

The focus - a path, a workspace (`front-app`), `diff` (files changed against `main`, uncommitted and untracked included), or free text (`caching only`) - is passed verbatim to every selected reviewer and narrows each domain's `## Scope`.

A domain whose `applies_when` does not hold is skipped **only when selected by `all`**, with one Coverage line `not applicable: <reason>`; naming it explicitly always runs it.

## Execution safety

- **No files.** No report, scratch, ledger, or notes, in the working tree or elsewhere. Findings live only in the reply.
- **Read-only.** Source and config are read, never edited. Reviewers run only their domain's `## Probe` commands.
- Never install, upgrade, run a fixer, deploy, promote, run `preview:*`, start a dev server, or call a deployed Worker or Preview unless the user asked. A probe blocked by the sandbox becomes a Needs-validation item naming the restriction; do not work around it.
- Implement nothing until the user asks after the reply ([Follow-up](#follow-up)).

## Run shape

1. **Select** - resolve the selector; evaluate `applies_when` for `all`.
2. **Review** - launch one `reviewer` subagent per selected domain, **all in a single message** so they run in parallel, each with the `model` from its frontmatter. Each prompt contains: the path `.agents/skills/review/reviewer.md`, the path of its domain file, the focus (or "none: the domain's default scope"), and the other selected domain ids. A single domain still gets its own subagent: its reads stay out of the main context, and the author is not the verifier.
3. **Verify** - in the main thread, per [Verification](#verification).
4. **Report** - one reply, per [Output](#output).

Without the `reviewer` agent or parallel subagents (e.g. Cursor), run the same contract for each domain in turn, then verify and report exactly the same way.

## Verification

Before anything reaches the reply:

1. For every Critical and Improvement item, re-open the cited `path:line` and confirm it says what the reviewer claims. A wrong location or claim is dropped; an overstated consequence is downgraded.
2. **Try to refute every Critical once**: look for the strongest control that would stop it (middleware, schema, lint rule, framework default, a test) and the rule that accepts it. If one holds, downgrade or drop.
3. Drop anything the domain's `## Accepted` or an owning rule records as deliberate, unless the reviewer cites a source that overturns its premise.
4. A finding without a verifiable source, or dependent on state outside the repo, moves to Needs validation.
5. Deduplicate across domains by slug and root cause (same file + same cause). The domain whose `## Overlaps` owns the concern keeps it; a `Hand-offs` item joins the owner's bucket when the owner was selected, and is reported under the originating domain otherwise.
6. Spot-check at least one Optional per domain the same way; if it fails, re-check the rest of that domain's Optionals.

## Output

One reply, in this order:

1. **Scope** - one line: domains run, focus, and "partial" when a focus, a skipped domain, or a failed probe narrowed coverage.
2. **Critical**, 3. **Improvements**, 4. **Optional** - each item `**C1** [domain] what - where - why - fix`, most severe and cheapest-to-fix first within a bucket. Prefix pure polish with `Nit:`.
5. **Hardening** - `**H1** [domain] gap - where - source`: best-practice gaps with no demonstrated consequence. Not bugs; the owner decides.
6. **Needs validation** - `**V1** [domain] hypothesis - missing fact - how to check`.
7. **Domain extras** - each selected domain's `## Extra output` block, under its name.
8. **Coverage** - per domain, one line: axes with findings, axes with no issues, axes not checked or not applicable, each with the reason.

IDs are `C`, `I`, `O`, `H`, `V` plus a counter per bucket, assigned after verification so they are gapless. Empty buckets say "None." A clean domain is a valid result: never pad it with low-value items, and never claim a domain is fully covered when an axis was not checked.

## Follow-up

The reply ends there. When the user answers with IDs (`fix C1, I3`, `accept O2`):

- `fix <ids>` - implement exactly those items, nothing adjacent; add a regression test for each Critical that has an owning test boundary (rule `quality/testing`); then run the checks the touched files need (`pnpm run check` at least; the affected turbo tasks when code or config changed).
- `accept <ids>` - add one line per item under that domain's `## Accepted`, or in the owning rule when one exists (both rule trees).
