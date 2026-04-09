---
title: Tailwind v4 — Common Animation Patterns and Anti-Patterns
impact: HIGH
impactDescription: ready-to-use patterns for the most common UI components and a checklist of mistakes to avoid
tags: tailwind, patterns, button, dropdown, popover, modal, toast, tooltip, stagger, frosted-glass, anti-patterns
---

## Tailwind v4 — Common Animation Patterns and Anti-Patterns

> Source: https://tailwindcss.com/docs

### Button with press feedback

```html
<button class="
  select-none cursor-pointer
  transition-transform duration-160 ease-out
  active:scale-[0.97]
  motion-reduce:transition-none
">
  Submit
</button>
```

### Dropdown / Select (scale from top)

```html
<div class="
  origin-top
  transition-[transform,opacity] duration-200 ease-out
  data-[state=closed]:scale-95 data-[state=closed]:opacity-0
  data-[state=open]:scale-100 data-[state=open]:opacity-100
  motion-reduce:transition-none
">
```

### Popover (scale from trigger — Radix UI)

```html
<div class="
  origin-(--radix-popover-content-transform-origin)
  transition-[transform,opacity] duration-200 ease-out
  data-[state=closed]:scale-95 data-[state=closed]:opacity-0
  data-[state=open]:scale-100 data-[state=open]:opacity-100
">
```

### Modal (scale from center)

```html
<div class="
  origin-center
  transition-[transform,opacity] duration-300 ease-out
  starting:scale-95 starting:opacity-0
  motion-reduce:transition-opacity
">
```

### Toast (slide up from bottom)

```html
<div class="
  transition-[transform,opacity] duration-400 ease-out
  starting:translate-y-full starting:opacity-0
  motion-reduce:transition-opacity motion-reduce:starting:translate-y-0
">
```

### Tooltip (scale from anchor, instant on subsequent)

```html
<!-- Base tooltip -->
<div class="
  origin-(--transform-origin)
  transition-[transform,opacity] duration-125 ease-out
  data-[state=closed]:scale-[0.97] data-[state=closed]:opacity-0
">

<!-- When data-instant is set, skip animation duration -->
<div class="
  origin-(--transform-origin)
  transition-[transform,opacity] duration-125 ease-out
  data-[state=closed]:scale-[0.97] data-[state=closed]:opacity-0
  data-instant:duration-0
">
```

### Stagger list entry

```html
<ul>
  {items.map((item, i) => (
    <li class={`
      animate-slide-up opacity-0
      [animation-fill-mode:both]
      [animation-delay:${i * 50}ms]
    `}>
      {item}
    </li>
  ))}
</ul>
```

Or with CSS:

```css
.stagger-item { animation: slide-up 300ms ease-out both; }
.stagger-item:nth-child(1) { animation-delay:   0ms; }
.stagger-item:nth-child(2) { animation-delay:  50ms; }
.stagger-item:nth-child(3) { animation-delay: 100ms; }
.stagger-item:nth-child(4) { animation-delay: 150ms; }
```

Keep delays short — 30–80ms between items. Longer delays make the interface feel slow.

### Frosted glass surface

```html
<div class="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border border-white/20 rounded-xl">
```

### What Not to Do

| Anti-pattern | Fix |
|---|---|
| `transition-all` | Use `transition-transform`, `transition-colors`, or `transition-[transform,opacity]` |
| `animate-spin` on an `<svg>` directly | Wrap in `<div class="animate-spin">` — SVG lacks hardware acceleration |
| `blur-2xl` or heavier in animations | Keep blur at `blur-xs` or `blur-sm`; heavy blur is expensive in Safari |
| `will-change-transform` on every element | Last resort only — over-use degrades performance |
| Hover without `[@media(hover:hover)]` guard | Touch triggers hover on tap; gate with the media query |
| `ease-in` on enter/exit | Use `ease-out` — `ease-in` starts slow and feels unresponsive |
| `duration-500` on UI elements | UI stays under `duration-300`; use longer only for marketing/explanatory motion |
