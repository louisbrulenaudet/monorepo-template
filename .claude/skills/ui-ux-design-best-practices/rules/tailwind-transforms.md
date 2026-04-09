---
title: Tailwind v4 — Transform Utilities
impact: HIGH
impactDescription: native CSS scale/translate/rotate properties and transform-origin are the foundation of all GPU-accelerated animation
tags: tailwind, transforms, scale, translate, rotate, transform-origin, GPU, hardware-acceleration
---

## Tailwind v4 — Transform Utilities

> Source: https://tailwindcss.com/docs

### `scale`

Docs: https://tailwindcss.com/docs/scale

> v4 uses the native CSS `scale` property, not `transform: scale()`.

| Class | Output |
|---|---|
| `scale-none` | `scale: none` |
| `scale-0` | `scale: 0% 0%` |
| `scale-50` | `scale: 50% 50%` |
| `scale-75` | `scale: 75% 75%` |
| `scale-90` | `scale: 90% 90%` |
| `scale-95` | `scale: 95% 95%` |
| `scale-100` | `scale: 100% 100%` |
| `scale-105` | `scale: 105% 105%` |
| `scale-110` | `scale: 110% 110%` |
| `scale-125` | `scale: 125% 125%` |
| `scale-150` | `scale: 150% 150%` |
| `scale-x-<number>` | X-axis only |
| `scale-y-<number>` | Y-axis only |
| `-scale-<number>` | Mirror + scale |
| `scale-[<value>]` | Arbitrary value |
| `scale-(<custom-property>)` | CSS variable shorthand |

```html
<!-- Button press feedback: subtle scale down -->
<button class="transition-transform duration-160 ease-out active:scale-[0.97]">

<!-- Entry animation: start slightly smaller -->
<div class="scale-95 opacity-0 transition-[transform,opacity] data-open:scale-100 data-open:opacity-100">

<!-- Hover scale with axis control -->
<img class="transition-transform hover:scale-x-105">
```

### `translate`

Docs: https://tailwindcss.com/docs/translate

> v4 uses the native CSS `translate` property. Percentage values are relative to the element's own size.

| Class | Output |
|---|---|
| `translate-x-<number>` | X-axis, spacing scale |
| `translate-y-<number>` | Y-axis, spacing scale |
| `translate-x-<fraction>` | X-axis percentage (e.g. `translate-x-1/2` → `50%`) |
| `translate-y-<fraction>` | Y-axis percentage |
| `translate-full` | `100% 100%` |
| `-translate-y-full` | `-100%` on Y (useful for slide-out upwards) |
| `translate-y-full` | `100%` on Y (useful for slide-in from bottom) |
| `translate-x-px` | `1px` |
| `translate-z-<number>` | Z-axis (requires `transform-3d` parent) |
| `translate-[<value>]` | Arbitrary value |
| `translate-(<custom-property>)` | CSS variable shorthand |

```html
<!-- Slide in from bottom (toast/drawer entry) -->
<div class="translate-y-full opacity-0 transition-[transform,opacity] duration-400
            data-visible:translate-y-0 data-visible:opacity-100">

<!-- Slide out to right on dismiss -->
<div class="translate-x-0 transition-transform data-dismissed:translate-x-full">

<!-- Subtle hover lift -->
<button class="transition-transform hover:-translate-y-0.5">

<!-- Use percentages for size-independent positioning -->
<div class="-translate-y-1/2">  <!-- Exactly half the element's own height -->
```

### `rotate`

Docs: https://tailwindcss.com/docs/rotate

> v4 uses the native CSS `rotate` property for 2D rotation.

| Class | Output |
|---|---|
| `rotate-0` | `rotate: 0deg` |
| `rotate-1` | `rotate: 1deg` |
| `rotate-2` | `rotate: 2deg` |
| `rotate-3` | `rotate: 3deg` |
| `rotate-6` | `rotate: 6deg` |
| `rotate-12` | `rotate: 12deg` |
| `rotate-45` | `rotate: 45deg` |
| `rotate-90` | `rotate: 90deg` |
| `rotate-180` | `rotate: 180deg` |
| `-rotate-<number>` | Negative rotation |
| `rotate-x-<number>` | 3D X-axis rotation (uses `transform`) |
| `rotate-y-<number>` | 3D Y-axis rotation |
| `rotate-[<value>]` | Arbitrary value |
| `rotate-(<custom-property>)` | CSS variable shorthand |

```html
<!-- Chevron that rotates when expanded -->
<svg class="transition-transform duration-200 ease-out
            group-data-open:rotate-180">

<!-- Spinner icon (use wrapper div for hardware acceleration) -->
<div class="animate-spin">
  <svg>...</svg>
</div>

<!-- Subtle hover rotation -->
<div class="transition-transform hover:rotate-3">
```

### `transform-origin`

Docs: https://tailwindcss.com/docs/transform-origin

| Class | `transform-origin` value |
|---|---|
| `origin-center` | `center` (default) |
| `origin-top` | `top` |
| `origin-top-right` | `top right` |
| `origin-right` | `right` |
| `origin-bottom-right` | `bottom right` |
| `origin-bottom` | `bottom` |
| `origin-bottom-left` | `bottom left` |
| `origin-left` | `left` |
| `origin-top-left` | `top left` |
| `origin-[<value>]` | Arbitrary value |
| `origin-(<custom-property>)` | CSS variable shorthand |

```html
<!-- Popover scales from trigger point (Radix UI) -->
<div class="origin-(--radix-popover-content-transform-origin)
            transition-[transform,opacity] duration-200 ease-out
            data-[state=closed]:scale-95 data-[state=closed]:opacity-0">

<!-- Dropdown scales from top -->
<div class="origin-top scale-95 opacity-0 transition-[transform,opacity]
            data-open:scale-100 data-open:opacity-100">

<!-- Modal stays centered — keep origin-center (default) -->
<div class="origin-center scale-95 opacity-0 ...">

<!-- Tooltip scales from its anchor -->
<div class="origin-(--transform-origin) scale-[0.97] opacity-0 ...">
```

### `transform` (GPU acceleration)

Docs: https://tailwindcss.com/docs/transform

| Class | Effect |
|---|---|
| `transform-gpu` | Adds `translateZ(0)` to force GPU compositing layer |
| `transform-cpu` | Default — CPU-based transforms |
| `transform-none` | Removes all transforms |

```html
<!-- Force GPU layer for smooth animation under load -->
<div class="scale-150 transform-gpu">

<!-- Remove all transforms at a breakpoint -->
<div class="skew-y-3 md:transform-none">
```
