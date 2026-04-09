---
title: Tailwind v4 — Transition Utilities
impact: HIGH
impactDescription: correct transition utilities ensure only the right properties animate, preventing layout thrashing and unintended side effects
tags: tailwind, transitions, duration, timing-function, easing, delay, motion-reduce
---

## Tailwind v4 — Transition Utilities

> Source: https://tailwindcss.com/docs

### `transition-property`

Docs: https://tailwindcss.com/docs/transition-property

| Class | `transition-property` value |
|---|---|
| `transition` | `color, background-color, border-color, outline-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, translate, scale, rotate, filter, backdrop-filter, display, content-visibility, overlay, pointer-events` |
| `transition-all` | `all` — avoid; prefer specific properties |
| `transition-colors` | color, background-color, border-color, and related color properties |
| `transition-opacity` | `opacity` |
| `transition-shadow` | `box-shadow` |
| `transition-transform` | `transform, translate, scale, rotate` |
| `transition-none` | `none` |
| `transition-[<value>]` | Arbitrary property list |
| `transition-(<custom-property>)` | CSS variable shorthand |

All `transition-*` utilities automatically apply:
- `transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1)` (ease-in-out) as default
- `transition-duration: 150ms` as default

**Prefer `transition-transform` or `transition-[transform,opacity]` over `transition-all`** — specifying exact properties avoids unnecessary work and prevents unintended transitions on layout properties.

```html
<!-- Correct: only animate what changes -->
<button class="transition-transform duration-160 ease-out active:scale-[0.97]">

<!-- Avoid: transitions everything including layout properties -->
<button class="transition-all duration-300">

<!-- Reduced motion override -->
<button class="transition hover:-translate-y-1 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
```

### `transition-duration`

Docs: https://tailwindcss.com/docs/transition-duration

| Class | Output |
|---|---|
| `duration-75` | `75ms` |
| `duration-100` | `100ms` |
| `duration-150` | `150ms` (Tailwind default) |
| `duration-200` | `200ms` |
| `duration-300` | `300ms` |
| `duration-500` | `500ms` |
| `duration-700` | `700ms` |
| `duration-1000` | `1000ms` |
| `duration-[<n>ms]` | Arbitrary value |
| `duration-(<custom-property>)` | CSS variable shorthand |

```html
<!-- Fine-grained durations not in the scale -->
<button class="duration-160">
<button class="duration-250">

<!-- Pair with motion-reduce -->
<div class="duration-300 motion-reduce:duration-0">
```

### `transition-timing-function`

Docs: https://tailwindcss.com/docs/transition-timing-function

| Class | CSS Output |
|---|---|
| `ease-linear` | `linear` |
| `ease-in` | `cubic-bezier(0.4, 0, 1, 1)` — **avoid for UI interactions** |
| `ease-out` | `cubic-bezier(0, 0, 0.2, 1)` |
| `ease-in-out` | `cubic-bezier(0.4, 0, 0.2, 1)` |
| `ease-[<value>]` | Arbitrary cubic-bezier |
| `ease-(<custom-property>)` | CSS variable shorthand |

**Register custom easing values for stronger curves:**

```css
@theme {
  /* Strong ease-out for UI interactions */
  --ease-out-strong: cubic-bezier(0.23, 1, 0.32, 1);

  /* Strong ease-in-out for on-screen movement */
  --ease-in-out-strong: cubic-bezier(0.77, 0, 0.175, 1);

  /* iOS-like drawer curve */
  --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
}
```

```html
<!-- Use via CSS variable shorthand -->
<div class="ease-(--ease-out-strong)">
<div class="ease-(--ease-drawer)">

<!-- Arbitrary inline when one-off -->
<div class="ease-[cubic-bezier(0.23,1,0.32,1)]">
```

### `transition-delay`

Docs: https://tailwindcss.com/docs/transition-delay

| Class | Output |
|---|---|
| `delay-75` | `75ms` |
| `delay-100` | `100ms` |
| `delay-150` | `150ms` |
| `delay-200` | `200ms` |
| `delay-300` | `300ms` |
| `delay-[<n>ms]` | Arbitrary value |
| `delay-(<custom-property>)` | CSS variable shorthand |

```html
<!-- Stagger multiple items -->
<div class="transition-[transform,opacity] delay-[0ms]">  Item 1 </div>
<div class="transition-[transform,opacity] delay-50"> Item 2 </div>
<div class="transition-[transform,opacity] delay-100">Item 3 </div>

<!-- Pair with motion-reduce -->
<div class="delay-300 motion-reduce:delay-0">
```
