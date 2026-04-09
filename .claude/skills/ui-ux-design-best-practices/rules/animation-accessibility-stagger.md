---
title: Accessibility, Stagger, and Asymmetric Timing
impact: HIGH
impactDescription: ensures motion-sensitive users are not harmed and stagger/timing patterns create natural cascading feel
tags: animation, accessibility, prefers-reduced-motion, stagger, asymmetric, touch, hover, timing
---

## Accessibility, Stagger, and Asymmetric Timing

### `prefers-reduced-motion`

Reduced motion means fewer and gentler animations, not zero. Keep opacity and color transitions that aid comprehension. Remove movement and position animations.

```css
@media (prefers-reduced-motion: reduce) {
  .element {
    animation: fade 0.2s ease;
    /* No transform-based motion */
  }
}
```

```jsx
// Framer Motion
const shouldReduceMotion = useReducedMotion();
const closedX = shouldReduceMotion ? 0 : '-100%';
```

```html
<!-- Tailwind v4 -->
<!-- motion-safe: add motion only when allowed -->
<div class="motion-safe:transition-[transform,opacity]
            motion-safe:hover:-translate-y-0.5">

<!-- motion-reduce: undo existing motion -->
<div class="transition-[transform,opacity] hover:-translate-y-0.5
            motion-reduce:transition-opacity motion-reduce:hover:translate-y-0">

<!-- Hide spinner entirely for reduced-motion users -->
<div class="animate-spin motion-reduce:hidden">
```

### Touch device hover states

Touch devices trigger hover on tap, causing false positives. Gate hover animations behind the hover media query.

```css
@media (hover: hover) and (pointer: fine) {
  .element:hover {
    transform: scale(1.05);
  }
}
```

```html
<!-- Tailwind v4 -->
<div class="[@media(hover:hover)and(pointer:fine)]:hover:scale-105 transition-transform">
```

### Stagger Animations

When multiple elements enter together, stagger their appearance. Each element animates in with a small delay after the previous one. This creates a cascading effect that feels more natural than everything appearing at once.

```css
.item {
  opacity: 0;
  transform: translateY(8px);
  animation: slide-up 300ms ease-out both;
}
.item:nth-child(1) { animation-delay:   0ms; }
.item:nth-child(2) { animation-delay:  50ms; }
.item:nth-child(3) { animation-delay: 100ms; }
.item:nth-child(4) { animation-delay: 150ms; }

@keyframes slide-up {
  to { opacity: 1; transform: translateY(0); }
}
```

```html
<!-- Tailwind v4 with inline delay -->
{items.map((item, i) => (
  <div
    class="animate-slide-up [animation-fill-mode:both]"
    style={{ animationDelay: `${i * 50}ms` }}
  >
    {item}
  </div>
))}
```

Keep stagger delays short — **30–80ms between items**. Longer delays make the interface feel slow. Stagger is decorative — never block interaction while stagger animations are playing.

### Asymmetric Enter/Exit Timing

Pressing should be slow when it needs to be deliberate (hold-to-delete: 2s linear), but release should always be snappy (200ms ease-out).

This pattern applies broadly: **slow where the user is deciding, fast where the system is responding.**

```css
/* Release: fast */
.overlay {
  transition: clip-path 200ms ease-out;
}

/* Press: slow and deliberate */
.button:active .overlay {
  transition: clip-path 2s linear;
}
```

```html
<!-- Tailwind v4 -->
<div class="[clip-path:inset(0_100%_0_0)]
            transition-[clip-path] duration-200 ease-out
            group-active:[clip-path:inset(0_0_0_0)]
            group-active:duration-[2s] group-active:ease-linear">
```

**Exit is always faster than enter.** Users are waiting for the system to respond on exit — slow exits feel broken.
