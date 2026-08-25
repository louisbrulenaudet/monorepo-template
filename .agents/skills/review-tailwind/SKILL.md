---
name: review-tailwind
description: "Tailwind CSS v4 review (CSS-first config, Vite plugin integration, better-tailwindcss lint rules) against current official Tailwind best practices. USE WHEN: user runs /review-tailwind or explicitly asks for this review. DO NOT USE WHEN: reviewing app code, other dev dependencies, or implementing features."
disable-model-invocation: true
---

# Review Tailwind

Review the Tailwind CSS v4 setup in `front-app` for alignment with current official best practices - CSS-first configuration, build integration, and lint enforcement for developer experience. Your reply must be a **plan of suggested changes**: concise, actionable, structured - not only prose.

## Invocation

Text after the slash command is additional scope/focus (e.g. "theme only", "lint rules") - narrow the review accordingly.

## Ground truth (mandatory)

Your pre-trained knowledge of Tailwind may be outdated (v4 changed the configuration model fundamentally). **Do not draft suggestions from memory alone.**

1. Resolve "Tailwind CSS" via the **Context7 MCP** (`resolve-library-id` → `query-docs`): CSS-first `@theme`/`@import "tailwindcss"` configuration, Vite plugin usage, v4 utility and variant behavior, content detection (no `content` array).
2. For anything Context7 lacks, use **Firecrawl search/scrape restricted to the official domain** (`tailwindcss.com/docs`) - upgrade guide, theme variables reference, compatibility notes for `@tailwindcss/vite` at the installed version.
3. Version currency: catalog `tailwindcss`, `@tailwindcss/vite`, `eslint-plugin-better-tailwindcss` in [pnpm-workspace.yaml](../../../pnpm-workspace.yaml) vs latest stable; flag deprecated class/config patterns.
4. Cite the retrieved source next to every finding; label anything unverifiable as **Unverified**.

## Scope artifacts

- Global stylesheet entry (`apps/front-app/src/**/*.css`, `@import "tailwindcss"` / `@theme` blocks)
- [apps/front-app/vite.config.ts](../../../apps/front-app/vite.config.ts) (`@tailwindcss/vite` plugin position)
- [.oxlintrc.json](../../../.oxlintrc.json) - `better-tailwindcss` plugin settings, especially `entryPoint` resolved from repo root
- Dark mode strategy; component class usage across [apps/front-app/src/](../../../apps/front-app/src/)
- [.claude/rules/frontend/tailwind.md](../../../.claude/rules/frontend/tailwind.md) ↔ `.cursor` twin

## Analysis axes

- **CSS-first config**: theme tokens defined via `@theme` in CSS (not legacy `tailwind.config.js`); design-token naming coherent; no dead config files from v3 era.
- **Build integration**: Vite plugin present and correctly ordered; no PostCSS leftovers; production output size sane (unused utilities not shipped).
- **Lint enforcement**: better-tailwindcss rules active (class order, no contradictory/duplicate classes, invalid classes); entry-point context resolution intact (single root oxlint pass contract per AGENTS.md).
- **Class hygiene**: consistent variants ordering; dark-mode strategy uniform (media vs class) with matching `@custom-variant` if used; no arbitrary-value abuse where a token exists.
- **Version currency**: new v4 features worth adopting; deprecated utilities flagged by current docs.

## DX & AI-agentic workflow

Verify agent-friendliness: lint errors for class issues are machine-readable through `pnpm lint:agent`; theme tokens documented so agents reuse tokens instead of inventing arbitrary values.

## Steps

1. Collect ground truth before reading config.
2. Read stylesheet entry, vite plugin wiring, lint settings; sample components for class patterns.
3. Walk each analysis axis; note findings or explicit one-line "no issues".
4. Compose the plan grouped Critical / Improvements / Optional with **what**, **where**, **why**, and source citations.

## Output format

1. **Critical** - broken styles pipeline, lint context broken, v3/v4 mixing.
2. **Improvements** - token/theme and lint alignment with current guidance.
3. **Optional** - nice-to-haves; prefix pure polish with **Nit:**.

Read-only review: produce the plan only; implement nothing unless explicitly asked afterwards.
