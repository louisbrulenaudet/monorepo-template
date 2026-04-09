---
title: Tailwind CSS v4 — What Changed and Arbitrary Value Syntax
impact: HIGH
impactDescription: understanding v4 breaking changes prevents using deprecated v3 patterns and unlocks new CSS variable shorthand
tags: tailwind, v4, migration, arbitrary-values, CSS-variables, theme, transforms
---

## Tailwind CSS v4 — What Changed and Arbitrary Value Syntax

> All content reflects **Tailwind CSS v4.2** (April 2026).
> Source: https://tailwindcss.com/docs

### Key v4 Changes from v3

| Feature | v3 | v4 |
|---|---|---|
| Transform activation | Required `transform` class as wrapper | Individual utilities work standalone |
| Native CSS properties | Used `transform: scale/rotate/translate()` | Uses native `scale`, `rotate`, `translate` CSS properties |
| Theme customization | `tailwind.config.js` JS object | `@theme { }` block in CSS |
| Animation definition | `theme.extend.keyframes` + `theme.extend.animation` | `@theme { --animate-*: ...; @keyframes { } }` |
| Easing values | String literals in config | `--ease-*` CSS variables via `@theme` |
| 3D transforms | Not supported natively | `rotate-x-*`, `rotate-y-*`, `rotate-z-*`, `translate-z-*`, `transform-3d` |
| CSS variable shorthand | Not available | `utility-(--var)` syntax (short for `utility-[var(--var)]`) |
| `@starting-style` support | Not available | `starting:` variant |

### Arbitrary Values and CSS Variable Shorthand

All v4 utilities support two extension syntaxes:

```html
<!-- Arbitrary value (square brackets) -->
<div class="duration-160 scale-[0.97] ease-[cubic-bezier(0.23,1,0.32,1)]">

<!-- CSS variable shorthand (parentheses) — v4 only -->
<div class="ease-(--ease-out-strong) scale-(--my-scale)">
<!-- Equivalent to: ease-[var(--ease-out-strong)] scale-[var(--my-scale)] -->
```

Use the CSS variable shorthand `utility-(--var)` whenever a value is registered in `@theme`. It is cleaner than `[var(--var)]` and is idiomatic v4.
