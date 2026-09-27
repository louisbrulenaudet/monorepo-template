---
id: tailwind
summary: v4 CSS-first config, Vite plugin, class hygiene
families: [frontend]
packages: [tailwindcss, @tailwindcss/vite, eslint-plugin-better-tailwindcss]
paths: [apps/front-*/src/**/*.css, .claude/rules/frontend/tailwind.md]
---

# Tailwind CSS

Tailwind CSS v4 in `front-app`: CSS-first configuration, build integration, and class hygiene.

## Ground truth

- **Stale-knowledge risk**: v4 changed the configuration model fundamentally.
- **Collector**: "Tailwind CSS" - CSS-first `@theme`/`@import "tailwindcss"`, Vite plugin usage, v4 utility and variant behavior, automatic content detection.
- **Local skill**: `.agents/skills/ui-ux-design-best-practices/SKILL.md` for Tailwind v4 patterns.
- **Web fallback**: `tailwindcss.com/docs` - upgrade guide, theme variables reference, `@tailwindcss/vite` compatibility notes.
- **Version currency**: catalog `tailwindcss`, `@tailwindcss/vite`, `eslint-plugin-better-tailwindcss` in [pnpm-workspace.yaml](../../../../pnpm-workspace.yaml); flag deprecated class/config patterns.

## Scope

- Global stylesheet entry (`apps/front-app/src/**/*.css`, `@import "tailwindcss"` / `@theme` blocks)
- [apps/front-app/vite.config.ts](../../../../apps/front-app/vite.config.ts) (`@tailwindcss/vite` position)
- Dark-mode strategy; class usage across [apps/front-app/src/](../../../../apps/front-app/src/)
- [.claude/rules/frontend/tailwind.md](../../../../.claude/rules/frontend/tailwind.md) ↔ `.cursor` twin

## Probe

Read the stylesheet entry and the Vite plugin wiring; sample components for class patterns.

## Axes

- **CSS-first config**: tokens in `@theme` (no legacy `tailwind.config.js`); coherent token naming; no dead v3-era config files.
- **Build integration**: Vite plugin present and correctly ordered; no PostCSS leftovers; unused utilities not shipped.
- **Class hygiene**: consistent variant ordering; uniform dark-mode strategy with a matching `@custom-variant` if used; no arbitrary values where a token exists.
- **Version currency**: new v4 features worth adopting; utilities deprecated by current docs.
- **Agent loop**: theme tokens documented so agents reuse tokens instead of inventing arbitrary values.

## Critical when

Broken styles pipeline; v3/v4 configuration mixing.

## Overlaps

The better-tailwindcss lint rules and `entryPoint` context resolution belong to `oxc`; plugin order across the whole Vite config belongs to `vite`.

## Accepted

- Token and dark-mode decisions in [.claude/rules/frontend/tailwind.md](../../../../.claude/rules/frontend/tailwind.md).
