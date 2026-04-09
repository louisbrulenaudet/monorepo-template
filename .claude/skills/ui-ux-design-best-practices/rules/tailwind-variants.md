---
title: Tailwind v4 — Accessibility Variants, @starting-style, and Stacking
impact: HIGH
impactDescription: motion-reduce/motion-safe and starting: variant are essential for accessible animations and CSS-only entry animations
tags: tailwind, variants, motion-reduce, motion-safe, starting-style, stacking, dark-mode, group, data-attributes
---

## Tailwind v4 — Accessibility Variants, `@starting-style`, and Stacking

> Source: https://tailwindcss.com/docs

### `motion-reduce:` and `motion-safe:`

| Variant | When applied |
|---|---|
| `motion-safe:` | `@media (prefers-reduced-motion: no-preference)` |
| `motion-reduce:` | `@media (prefers-reduced-motion: reduce)` |

**Prefer `motion-safe:` when adding motion from scratch** — it results in fewer overrides. Use `motion-reduce:` when undoing existing motion utilities.

```html
<!-- motion-safe approach: add animation only when motion is ok -->
<button class="motion-safe:transition motion-safe:hover:-translate-y-0.5">
  Save changes
</button>

<!-- motion-reduce approach: undo existing animations -->
<button class="transition hover:-translate-y-0.5
               motion-reduce:transition-none motion-reduce:hover:translate-y-0">
  Save changes
</button>

<!-- Hide spinner for reduced motion users -->
<svg class="animate-spin motion-reduce:hidden">...</svg>

<!-- Keep opacity fade, remove movement -->
<div class="transition-[transform,opacity] duration-300
            motion-reduce:transition-opacity">
```

### Touch hover gating

```html
<!-- Only apply hover on devices that support it (not touch screens) -->
<div class="[@media(hover:hover)and(pointer:fine)]:hover:scale-105 transition-transform">
```

### `@starting-style` via `starting:` Variant (v4 New)

Docs: https://tailwindcss.com/docs/hover-focus-and-other-states

Apply styles when an element is **first rendered** or transitions from `display: none`, enabling pure-CSS enter animations without JavaScript.

```html
<!-- Popover with CSS-only enter animation -->
<div popover id="my-popover"
     class="opacity-100 scale-100
            transition-[transform,opacity] duration-200 ease-out
            starting:opacity-0 starting:scale-95">
  Popover content
</div>

<!-- Toast entering from below -->
<div class="translate-y-0 opacity-100
            transition-[transform,opacity] duration-300 ease-out
            starting:translate-y-4 starting:opacity-0">
  Notification text
</div>
```

This replaces the common React pattern of `useEffect(() => setMounted(true), [])`.

### Stacking Variants

Variants can be combined in any order:

```html
<!-- Dark mode + hover -->
<div class="dark:hover:bg-gray-700">

<!-- Reduced motion + hover animation -->
<div class="motion-safe:hover:scale-110 transition-transform">

<!-- State machine via data attributes (Radix UI / Headless UI pattern) -->
<div class="opacity-100 scale-100
            data-[state=closed]:opacity-0 data-[state=closed]:scale-95
            transition-[transform,opacity] duration-200 ease-out
            origin-(--radix-popover-content-transform-origin)">

<!-- Group pattern: style child based on parent state -->
<div class="group hover:bg-gray-50">
  <p class="text-gray-500 group-hover:text-gray-900 transition-colors duration-150">
    Content
  </p>
</div>
```
