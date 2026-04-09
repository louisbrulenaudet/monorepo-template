---
title: Tailwind v4 — Animation Utilities and Custom Keyframes
impact: MEDIUM
impactDescription: built-in animate-* utilities and @theme keyframe registration cover the majority of animation use cases without custom CSS
tags: tailwind, animation, animate, keyframes, theme, spin, pulse, ping, bounce, custom
---

## Tailwind v4 — Animation Utilities and Custom Keyframes

> Source: https://tailwindcss.com/docs

### `animate-*` built-in utilities

Docs: https://tailwindcss.com/docs/animation

| Class | Animation |
|---|---|
| `animate-spin` | `spin 1s linear infinite` — loading indicators |
| `animate-ping` | `ping 1s cubic-bezier(0,0,0.2,1) infinite` — notification pings |
| `animate-pulse` | `pulse 2s cubic-bezier(0.4,0,0.6,1) infinite` — skeleton loading |
| `animate-bounce` | `bounce 1s infinite` |
| `animate-none` | Removes animation |
| `animate-[<value>]` | Arbitrary animation shorthand |
| `animate-(<custom-property>)` | CSS variable shorthand |

```html
<!-- Animate spinner wrapper (not SVG directly — no hardware acceleration on SVG) -->
<div class="animate-spin motion-reduce:animate-none">
  <svg>...</svg>
</div>

<!-- Skeleton loader -->
<div class="animate-pulse bg-gray-200 rounded h-4 w-full">

<!-- Ping notification badge -->
<span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75">
```

### Custom Animations with `@theme`

Define custom keyframes and animation shorthands directly in CSS via the `@theme` block:

```css
@theme {
  --animate-fade-in: fade-in 300ms ease-out both;
  --animate-slide-up: slide-up 300ms ease-out both;
  --animate-wiggle: wiggle 0.5s ease-in-out;

  @keyframes fade-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }

  @keyframes slide-up {
    from { transform: translateY(8px); opacity: 0; }
    to   { transform: translateY(0);   opacity: 1; }
  }

  @keyframes wiggle {
    0%, 100% { transform: rotate(-3deg); }
    50%       { transform: rotate(3deg);  }
  }
}
```

```html
<div class="animate-fade-in">
<div class="animate-slide-up">
<div class="animate-wiggle">
<div class="animate-(--animate-wiggle)">  <!-- CSS var shorthand -->
```

The `both` fill mode applies the keyframe styles before and after the animation runs, preventing flash of unstyled state.
