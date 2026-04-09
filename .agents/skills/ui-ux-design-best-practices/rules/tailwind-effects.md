---
title: Tailwind v4 — Opacity, Blur, and Backdrop Blur
impact: MEDIUM
impactDescription: opacity and blur are the two safe-to-animate properties beyond transform; correct usage avoids Safari performance issues
tags: tailwind, opacity, blur, backdrop-blur, frosted-glass, performance, safari
---

## Tailwind v4 — Opacity, Blur, and Backdrop Blur

> Source: https://tailwindcss.com/docs

### `opacity`

Docs: https://tailwindcss.com/docs/opacity

| Class | Output |
|---|---|
| `opacity-0` | `opacity: 0` |
| `opacity-5` | `opacity: 0.05` |
| `opacity-10` | `opacity: 0.1` |
| `opacity-25` | `opacity: 0.25` |
| `opacity-50` | `opacity: 0.5` |
| `opacity-75` | `opacity: 0.75` |
| `opacity-100` | `opacity: 1` |
| `opacity-[<value>]` | Arbitrary value |
| `opacity-(<custom-property>)` | CSS variable shorthand |

```html
<!-- Entry/exit animation always pairs opacity with transform -->
<div class="opacity-0 translate-y-2 transition-[transform,opacity] duration-300 ease-out
            data-visible:opacity-100 data-visible:translate-y-0">

<!-- Disabled state -->
<button class="opacity-100 disabled:opacity-50 disabled:cursor-not-allowed">

<!-- Skeleton placeholder -->
<div class="opacity-0 animate-pulse">
```

### `blur`

Docs: https://tailwindcss.com/docs/blur

| Class | Blur radius |
|---|---|
| `blur-xs` | `4px` |
| `blur-sm` | `8px` |
| `blur-md` | `12px` |
| `blur-lg` | `16px` |
| `blur-xl` | `24px` |
| `blur-2xl` | `40px` |
| `blur-3xl` | `64px` |
| `blur-none` | Removes blur |
| `blur-[<value>]` | Arbitrary value |
| `blur-(<custom-property>)` | CSS variable shorthand |

```html
<!-- Blur to mask imperfect crossfades (keep under blur-sm / blur-md) -->
<span class="transition-[filter,opacity] duration-200
             group-data-transitioning:blur-xs group-data-transitioning:opacity-70">

<!-- Custom blur step -->
@theme { --blur-2xs: 2px; }
<img class="blur-2xs">
```

**Keep blur under `blur-sm` (8px) for performance.** Heavy blur is expensive in Safari.

### `backdrop-blur`

Docs: https://tailwindcss.com/docs/backdrop-blur

Same scale as `blur-*` but applies behind the element (frosted glass effect).

```html
<!-- Frosted glass modal backdrop -->
<div class="fixed inset-0 bg-black/30 backdrop-blur-sm">

<!-- Navigation bar -->
<nav class="bg-white/80 backdrop-blur-md">

<!-- Frosted glass surface (full pattern) -->
<div class="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border border-white/20 rounded-xl">
```
