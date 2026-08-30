---
name: review-cursor
description: "Cursor setup review (.cursor settings, rules, hooks.json, agents, mcp.json) against current official best practices and parity with the Claude tree. USE WHEN: user runs /review-cursor or explicitly asks for this review. DO NOT USE WHEN: reviewing app code, other dev dependencies, or implementing features."
disable-model-invocation: true
context: fork
background: true
model: sonnet
effort: medium
---

# Review Cursor

Review the Cursor agent setup for alignment with current official Cursor best practices, optimal developer experience (DX), and AI collaboration quality - including parity with the mirrored Claude tree. Your reply must be a **plan of suggested changes**: concise, actionable, structured - not only prose.

## Invocation

Text after the slash command is additional scope/focus (e.g. "rules only", "hooks") - narrow the review accordingly.

## Ground truth (mandatory)

Your pre-trained knowledge of Cursor may be outdated. **Do not draft suggestions from memory alone.**

1. Try the **Context7 MCP** first (`resolve-library-id` for "Cursor") for rules frontmatter (`description`/`globs`/`alwaysApply`), hooks events, and agent config keys.
2. For anything Context7 lacks, use **Firecrawl search/scrape restricted to the official domain** (`cursor.com/docs` and subpaths) - Agent rules, hooks reference, MCP, memory/AGENTS.md guidance.
3. Check version currency against current Cursor release notes/changelog; flag deprecated rule keys or hook events still present.
4. Cite the retrieved source next to every finding; label anything unverifiable as **Unverified**.

## Scope artifacts

- [.cursor/settings.json](../../../.cursor/settings.json)
- [.cursor/rules/](../../../.cursor/rules/) - category folders (`core`, `frontend`, `backend`, `contracts`, `quality`, `tests`, `ops`); only `core/guardrails` should be always-on
- [.cursor/hooks.json](../../../.cursor/hooks.json) - `beforeShellExecution` git guards (`failClosed`), `afterFileEdit` format/lint, `sessionStart`
- [.cursor/agents/](../../../.cursor/agents/) - `verifier`, `bundle-analyzer`, `docs-researcher`
- [.cursor/mcp.json](../../../.cursor/mcp.json) - server list parity with [.mcp.json](../../../.mcp.json); Cloudflare plugin disabled unless account-scoped features needed

## Parity axes (Claude ↔ Cursor sync policy)

Per the sync policy in the `monorepo-agent-setup` skill:

- Every `.claude/rules/<cat>/<name>.md` has a `.cursor/rules/<cat>/<name>.mdc` twin with remapped frontmatter (Claude `paths` ↔ Cursor `globs`/`alwaysApply`); basenames match; scoping equivalent.
- Agents kept product-native but semantically equal (`model`, `tools`, `readonly`).
- Hook scripts live only under `hooks/` (shared); both wirings call the same scripts; behavioral drift flagged.
- Nested guides: `AGENTS.md` canonical, `CLAUDE.md` = `@AGENTS.md` + Claude-only bullets.

## Analysis axes

- **Rules hygiene**: globs precise (no over-broad matching that wastes context); no stale rules pointing at removed files; description quality sufficient for apply decisions.
- **Hooks**: commands fast and deterministic; `failClosed` semantics intentional; no duplicated logic outside `hooks/`.
- **Agents**: least-privilege tool lists; review agents cannot edit.
- **MCP**: `type: "http"` on HTTP servers; no double-registered Context7; Cloudflare plugin/MCP split per repo policy.
- **Version currency**: new Cursor capabilities worth adopting (rules features, hooks events, agent options).

## Steps

1. Collect ground truth before reading config.
2. Read all scope artifacts; diff the rules tree against `.claude/rules/`.
3. Walk parity + analysis axes; note findings or explicit "no issues".
4. Compose the plan grouped Critical / Improvements / Optional with **what**, **where**, **why**, and source citations.

## Output format

1. **Critical** - broken guards, missing twins for active Claude rules, deprecated keys.
2. **Improvements** - parity fixes and best-practice alignment.
3. **Optional** - nice-to-haves; prefix pure polish with **Nit:**.

Read-only review: produce the plan only; implement nothing unless explicitly asked afterwards.
