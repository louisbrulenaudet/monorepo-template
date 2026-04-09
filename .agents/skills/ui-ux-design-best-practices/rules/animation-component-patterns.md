---
title: Component Animation Patterns
impact: HIGH
impactDescription: direct user-facing feel — buttons, popovers, tooltips are touched constantly
tags: animation, components, buttons, popovers, tooltips, blur, scale, feedback
---

## Component Animation Patterns

Concrete patterns for the most common interactive components. Each pattern pairs the principle with CSS and Tailwind v4 implementations.

### Buttons must feel responsive

Add a subtle scale on `:active`. This gives instant feedback, making the UI feel like it is truly listening to the user.

```css
/* CSS */
.button {
  transition: transform 160ms ease-out;
}
.button:active {
  transform: scale(0.97);
}
```

```html
<!-- Tailwind v4 -->
<button class="transition-transform duration-160 ease-out active:scale-[0.97]
               motion-reduce:transition-none select-none">
```

The scale should be subtle (0.95–0.98). This applies to any pressable element.

### Never animate from `scale(0)`

Nothing in the real world disappears and reappears completely. Elements animating from `scale(0)` appear out of nowhere.

Start from `scale(0.9)` or higher, combined with opacity. Even a barely-visible initial scale makes the entrance feel natural.

```css
/* Bad */
.entering { transform: scale(0); }

/* Good */
.entering { transform: scale(0.95); opacity: 0; }
```

```html
<!-- Tailwind v4 -->
<!-- Bad -->
<div class="starting:scale-0">

<!-- Good: start at 95% with opacity 0 -->
<div class="starting:scale-95 starting:opacity-0
            transition-[transform,opacity] duration-200 ease-out">
```

### Make popovers origin-aware

Popovers should scale in from their trigger, not from center. The default `origin-center` is wrong for almost every popover.

**Exception: modals.** Modals should keep `origin-center` because they are not anchored to a specific trigger — they appear centered in the viewport.

```css
/* Radix UI */
.popover {
  transform-origin: var(--radix-popover-content-transform-origin);
}

/* Base UI */
.popover {
  transform-origin: var(--transform-origin);
}
```

```html
<!-- Tailwind v4 with Radix UI -->
<div class="origin-(--radix-popover-content-transform-origin)
            transition-[transform,opacity] duration-200 ease-out
            data-[state=closed]:scale-95 data-[state=closed]:opacity-0">

<!-- Tailwind v4 with Base UI -->
<div class="origin-(--transform-origin)
            transition-[transform,opacity] duration-200 ease-out
            data-closed:scale-[0.97] data-closed:opacity-0">

<!-- Modal: keep centered -->
<div class="origin-center
            transition-[transform,opacity] duration-300 ease-out
            starting:scale-95 starting:opacity-0">
```

### Tooltips: skip delay and animation on subsequent hovers

Tooltips should delay before appearing to prevent accidental activation. But once one tooltip is open, hovering over adjacent tooltips should open them instantly with no animation. This feels faster without defeating the purpose of the initial delay.

```css
.tooltip {
  transition: transform 125ms ease-out, opacity 125ms ease-out;
  transform-origin: var(--transform-origin);
}
.tooltip[data-starting-style],
.tooltip[data-ending-style] {
  opacity: 0;
  transform: scale(0.97);
}
/* Skip animation on subsequent tooltips */
.tooltip[data-instant] {
  transition-duration: 0ms;
}
```

```html
<!-- Tailwind v4 -->
<div class="origin-(--transform-origin)
            transition-[transform,opacity] duration-125 ease-out
            data-[state=closed]:scale-[0.97] data-[state=closed]:opacity-0
            data-instant:duration-0">
```

### Use blur to mask imperfect transitions

When a crossfade between two states looks off despite trying different easings and durations, add subtle `blur` during the transition.

**Why blur works:** Without it, you see two distinct objects overlapping. Blur bridges the visual gap, tricking the eye into perceiving a single smooth transformation instead of two objects swapping.

```css
/* CSS */
.button-content {
  transition: filter 200ms ease, opacity 200ms ease;
}
.button-content.transitioning {
  filter: blur(2px);
  opacity: 0.7;
}
```

```html
<!-- Tailwind v4 -->
<span class="transition-[filter,opacity] duration-200
             group-data-loading:blur-xs group-data-loading:opacity-70">
  Button label
</span>
```

Keep blur under `blur-sm` (8px). Heavy blur is expensive, especially in Safari.
