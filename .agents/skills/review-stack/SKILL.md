---
name: review-stack
description: "Stack review of one or more third-party tools (OXC, TanStack, Vite, cf, Sentry, pnpm, Claude Code...) against current official best practices: one parallel subagent per tool, verified findings, one consolidated plan in chat. USE WHEN: user runs /review-stack or explicitly asks for a dependency/stack review. DO NOT USE WHEN: reviewing our code or design by domain (/review), a PR, or implementing features."
argument-hint: "<dep|family|all|changed[:ref]>[,...] [focus]"
disable-model-invocation: true
---

# Review Stack

Check that each selected tool is configured and used the way its **current** official documentation recommends, then give the owner a verified, cited, prioritized plan with the smallest effective fix per item. A deviation from a checklist is not a finding until it has a repo location, a retrieved source, and a concrete consequence.

One review or twenty, the process is the same: one hunter per dep, in parallel, then one verification pass and **one reply**. It writes no files.

## Registry

Each `deps/<id>.md` is one dep. Its frontmatter is the registry - `id`, `summary`, `families`, `packages` (catalog names), `paths` (globs whose change makes the dep "changed"), optional `version_cmd` - and its body is the companion the hunter follows:

- `## Ground truth` - Collector topics, Web fallback domains, Version currency, Local schema / Local skill
- `## Scope` - artifacts to read
- `## Probe` - the reading pass and the only commands the hunter may run
- `## Axes` - what to check; the last axis is the agent loop
- `## Critical when` - severity anchors for this dep
- `## Overlaps` - which concerns another dep owns
- `## Accepted` - deliberate choices not to re-report, usually a pointer to the rule that records the reason

**Adding a dep** = adding one `deps/<id>.md` with that frontmatter and those sections. Nothing else lists deps.

## Preflight

Run once, in the main thread, before any hunter:

```bash
node .agents/skills/review-stack/scripts/preflight.mjs <selector>
```

The first word of the arguments is the selector; the rest is the **focus**, which narrows every selected review (`/review-stack tanstack caching only`). The script reads only and prints to stdout:

- no selector → the registry table and families; print it and stop.
- unknown selector → the same table after an error; print it and stop.
- otherwise → the selected deps, and per dep its catalog / installed / latest versions (`pnpm ls`, `pnpm outdated`) plus `version_cmd` output. With `changed[:<ref>]`, only the deps whose `paths` or catalog entries changed since `<ref>` (default: latest `v*` tag, else the merge-base with `main`), with the matching files.

Selectors: a dep `id`, a family, `all`, `changed` or `changed:<ref>`; comma-separate to combine (`oxc,knip`, `changed,sentry`). "Nothing selected" from `changed` is the answer: say so in one line and stop.

## Execution safety

- **No files.** No report, scratch, ledger, or notes, in the working tree or elsewhere. Findings live only in the reply.
- **Read-only.** Source and config are read, never edited. Hunters run only their companion's **Probe** commands plus `pnpm why <pkg>`; the preflight already owns version lookups.
- Never install, upgrade, `fix`, deploy, promote, run `preview:*`, or call a third-party service with credentials (e.g. `sentry-cli`). A probe blocked by the sandbox becomes a Needs-validation item naming the restriction; do not work around it.
- Implement nothing until the user asks after the reply (see [Follow-up](#follow-up)).

## Run shape

1. **Preflight** - run the script; keep its output.
2. **Hunt** - launch one `general-purpose` subagent per selected dep (model `sonnet`), **all in a single message** so they run in parallel. Each prompt contains, verbatim: the *Ground truth*, *Evidence bar*, *Accepted choices*, *Severity*, *Smallest effective fix*, *Hunter return contract*, and *Anti-patterns* sections of this file, the dep's companion file, the dep's preflight block, the focus, and the other selected dep ids with their `Overlaps` lines. A single dep still gets its own subagent: doc dumps stay out of the main context, and the author is not the verifier.
3. **Verify** - in the main thread, per [Verification](#verification).
4. **Report** - one reply, per [Output](#output).

Without parallel subagents (e.g. Cursor), run the same hunter contract for each dep in turn, then verify and report exactly the same way.

## Ground truth

Pre-trained knowledge of these tools is presumed stale. **Never draft a finding from memory.**

1. Resolve the companion's **Collector** topics through the installed documentation MCP servers (library resolver, vendor doc server) at the **installed** version from the preflight.
2. For what the collector lacks, fetch directly from the companion's **Web fallback** domains only.
3. **Version currency** from the preflight block: when installed ≠ latest, read the changelog between the two before recommending anything; when installed ≠ the catalog range, that drift is itself a finding.
4. Any **Local schema** or **Local skill** named is consulted too; a local schema beats docs for key validity at the installed version, official docs beat a local skill.

## Evidence bar

Every finding carries all three:

- **Where** - repo-relative `path:line` (or the exact key) that exhibits it.
- **Source** - the retrieved page or changelog entry (URL + version) that states the current recommendation.
- **Consequence** - what concretely goes wrong or is lost: a broken or silently green gate, a removed or deprecated API in use, a security, secret, or sensitive-data exposure, measurable speed or cache loss, or friction an agent or developer actually hits.

Missing **Source**, or dependent on a fact outside the repo (dashboard setting, hosted-runner behavior, registry or SaaS project state), it is **Needs validation**: no severity, and it names the exact missing fact plus how the owner can check it.

## Accepted choices

A choice listed under the companion's `## Accepted`, recorded in the rule it points to, or explained by a why-comment at the site is **not a finding**. Re-open it only when the retrieved source shows its premise no longer holds; then it is an Improvement citing both the rule and the source. When the owner rejects a finding as deliberate, the fix is one line under that dep's `## Accepted` (or in the owning rule), so the next run stays quiet.

## Severity

- **Critical** - config is invalid or broken; a gate passes while checking nothing; code uses an API removed in the installed version or the next already-pinned major; a secret, sensitive data, or a privileged surface is exposed; agents or CI consume a wrong output contract.
- **Improvement** - alignment with current best practice whose benefit you can state (faster runs, more cache hits, fewer false positives, less boilerplate, clearer agent loop).
- **Optional** - polish; prefix `Nit:` when purely cosmetic.

Discriminator: does it break or defeat something, or only fall short of ideal? If you cannot name the concrete damage, the severity is lower than it feels. The companion's **Critical when** anchors this per dep.

## Smallest effective fix

Each finding names the narrowest change that resolves it: the exact key, value, file, or command. Fixes respect repo policy - `catalog:` for third-party deps, `workspace:*` internally, rule `quality/comments`, rule `core/guardrails`, generated files regenerated rather than hand-edited, `.claude/rules` edits mirrored in `.cursor/rules`. Note the trade-off in one clause when there is one.

## Hunter return contract

Each subagent returns exactly this, in prose, and nothing else:

```text
## <dep> - installed <version> / latest <version>
Findings:
- [Critical|Improvement|Optional] <what> - where: <path:line> - why: <consequence> - source: <url@version> - fix: <smallest change>
Needs validation:
- <hypothesis> - missing fact: <what> - how to check: <owner-side step>
Coverage:
- <axis>: finding | no issues | not checked (<reason>)
```

Every axis in the companion appears under Coverage. No preamble, no summary.

## Verification

The main thread verifies before anything reaches the reply:

1. For every Critical and Improvement item, re-open the cited `path:line` and confirm it says what the hunter claims. A wrong location or claim is dropped; an overstated consequence is downgraded.
2. Drop anything covered by [Accepted choices](#accepted-choices) unless the hunter cites a source that overturns its premise.
3. A finding whose source is missing or unverifiable moves to Needs validation.
4. Deduplicate across deps by fingerprint (file + root cause). When both deps are selected, the `Overlaps` line decides which keeps it; when only one is, it keeps it.
5. Spot-check at least one Optional per dep the same way; if it fails, re-check the rest of that dep's Optionals.

## Output

One reply, in this order:

1. **Scope** - one line: deps (installed → latest), selector and focus, and "partial" when a focus, `changed`, or a failed probe narrowed coverage.
2. **Critical**, 3. **Improvements**, 4. **Optional** - each item `**C1** [dep] what - where - why - source - fix`, most severe and cheapest-to-fix first within a bucket.
5. **Needs validation** - `**V1** [dep] hypothesis - missing fact - how to check`.
6. **Coverage** - per dep, one line listing axes with findings, axes with no issues, and axes not checked with the reason.

IDs are `C`, `I`, `O`, `V` plus a counter per bucket, assigned after verification so they are gapless. Empty buckets say "None." Never claim a dep is fully aligned when any axis was not checked.

## Follow-up

The reply ends there. When the user answers with IDs (`fix C1, I3`, `accept O2`):

- `fix <ids>` - implement exactly those items, nothing adjacent, then run the checks the touched files need (`pnpm run check` at least; the affected turbo tasks when code or config changed).
- `accept <ids>` - add one line per item under that dep's `## Accepted`, or in the owning rule when one exists.

## Anti-patterns

1. Checklist deviations or style preferences presented as findings without a consequence.
2. Claims sourced from memory, or a citation that does not state what the finding says.
3. "Upgrade to latest" without reading the changelog between installed and latest.
4. Recommending a key that restates the tool's default.
5. Re-reporting an accepted choice without a source that overturns it.
6. Fixes that violate repo rules (catalog, boundaries, comments, guardrails, generated files).
7. The same root cause reported under two deps.
8. Guessing hosted, dashboard, or SaaS state instead of filing Needs validation.
9. Writing files, running fixers, or implementing anything before a `fix` follow-up.
