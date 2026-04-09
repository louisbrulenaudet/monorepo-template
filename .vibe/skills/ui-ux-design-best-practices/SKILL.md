---
name: ui-ux-design-best-practices
description: UI/UX polish, component design, animation decisions, and Tailwind v4 patterns for making interfaces feel right. Use when reviewing, writing, or refactoring UI code involving animations, transitions, CSS transforms, gestures, Tailwind utility classes, or interactive component behavior. Triggers on tasks involving motion design, interactive states (hover/active/focus), component feel, or any use of Tailwind transition/transform/animation utilities.
---

# UI/UX Design Best Practices

Guidelines for building interfaces where every interaction detail compounds into something that feels right. Covers animation decisions, Tailwind v4 motion utilities, component interaction patterns, and accessibility requirements.

## When to Apply

Load this skill when:
- Writing or reviewing components with hover, active, focus, or enter/exit animations
- Implementing transitions, transforms, or keyframe animations (CSS or Tailwind)
- Reviewing Tailwind utility usage for motion-related classes
- Designing interactive elements: buttons, dropdowns, modals, drawers, tooltips, popovers
- Checking accessibility for motion sensitivity (`prefers-reduced-motion`)
- Implementing gesture or drag interactions
- Debugging janky or sluggish animations

## Reference Documentation

### Animation

- `rules/animation-decision-framework.md` — core philosophy, should-animate decision tree, easing selection, duration cheatsheet, perceived performance
- `rules/animation-springs.md` — spring config (Framer Motion / Motion), mouse interactions, interruptibility advantage
- `rules/animation-component-patterns.md` — buttons, scale(0) rule, origin-aware popovers, tooltip instant-on-subsequent, blur crossfades
- `rules/animation-transitions-transforms.md` — CSS transitions vs keyframes, `@starting-style`, translateY percentages, scale children, GPU acceleration
- `rules/animation-clip-path.md` — `inset()` shape, hold-to-delete/confirm pattern, tab color transitions, scroll reveals, comparison sliders
- `rules/animation-gestures.md` — momentum dismissal, boundary damping, pointer capture, multi-touch protection, friction stops
- `rules/animation-performance.md` — only animate transform/opacity, CSS variable inheritance, Framer Motion hardware acceleration, WAAPI
- `rules/animation-accessibility-stagger.md` — `prefers-reduced-motion`, touch hover gating, stagger delays, asymmetric enter/exit timing
- `rules/animation-review-checklist.md` — component design principles, slow-motion debugging, review checklist table

### Tailwind v4

- `rules/tailwind-v4-changes.md` — v3→v4 migration table, arbitrary value syntax, CSS variable shorthand
- `rules/tailwind-transitions.md` — `transition-property`, `transition-duration`, `transition-timing-function`, `transition-delay`
- `rules/tailwind-transforms.md` — `scale`, `translate`, `rotate`, `transform-origin`, GPU `transform-gpu`
- `rules/tailwind-animations.md` — `animate-*` builtins, custom `@theme` keyframes
- `rules/tailwind-effects.md` — `opacity`, `blur`, `backdrop-blur`
- `rules/tailwind-interactivity.md` — `will-change`, `pointer-events`, `cursor`, `user-select`
- `rules/tailwind-variants.md` — `motion-reduce:` / `motion-safe:`, touch hover gating, `starting:`, stacking variants
- `rules/tailwind-patterns.md` — ready-to-use patterns (button, dropdown, modal, toast, tooltip, stagger, frosted glass) + anti-patterns table

## Quick Reference

### The One Rule

**Only animate `transform` and `opacity`.** These skip layout and paint, running on the GPU. Animating `height`, `padding`, `margin`, or `width` triggers all three rendering steps and causes jank.

### Animation Decision by Frequency

| Frequency | Decision |
|---|---|
| 100+ times/day (keyboard shortcuts, command palette) | No animation — ever |
| Tens of times/day (hover effects, list navigation) | Remove or drastically reduce |
| Occasional (modals, drawers, toasts) | Standard animation |
| Rare or first-time (onboarding, celebrations) | Can add delight |

### Duration Cheatsheet

| Element | Duration |
|---|---|
| Button press feedback | 100–160ms |
| Tooltips, small popovers | 125–200ms |
| Dropdowns, selects | 150–250ms |
| Modals, drawers | 200–500ms |
| Marketing / explanatory | Can be longer |

**Rule:** UI animations under 300ms. A 180ms dropdown feels more responsive than a 400ms one.

### Easing Cheatsheet

| Situation | Easing | Tailwind |
|---|---|---|
| Element entering / exiting | ease-out | `ease-out` |
| Element moving on screen | ease-in-out | `ease-in-out` |
| Hover / color change | ease | `ease-linear` or default |
| Constant motion (spinner, marquee) | linear | `ease-linear` |

**Never use `ease-in` for UI interactions.** It starts slow — the exact moment the user is watching most closely — making the interface feel sluggish.

### Custom Easing Values (register in `@theme`)

```css
@theme {
  --ease-out-strong:  cubic-bezier(0.23, 1, 0.32, 1);
  --ease-in-out-strong: cubic-bezier(0.77, 0, 0.175, 1);
  --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
}
```

```html
<!-- Use in Tailwind via CSS variable shorthand -->
<div class="ease-(--ease-out-strong)">...</div>
```

### Tailwind Quick Patterns

```html
<!-- Button press feedback -->
<button class="transition-transform duration-160 ease-out active:scale-[0.97]">

<!-- Dropdown / popover entry (scale from origin) -->
<div class="transition-[transform,opacity] duration-200 ease-out
            data-[state=closed]:scale-95 data-[state=closed]:opacity-0
            origin-top-left">

<!-- Toast / modal entry -->
<div class="transition-[transform,opacity] duration-300 ease-out
            starting:opacity-0 starting:translate-y-4">

<!-- Respect reduced motion -->
<div class="transition-transform motion-reduce:transition-none">
```

## Review Format

When reviewing UI code, output a markdown table:

| Before | After | Why |
|---|---|---|
| `transition: all 300ms` | `transition: transform 200ms ease-out` | Specify exact properties; avoid `all` |
| `transform: scale(0)` | `transform: scale(0.95); opacity: 0` | Nothing appears from nothing |
| `ease-in` on dropdown | `ease-out` with custom curve | `ease-in` feels sluggish |
| No `:active` state on button | `active:scale-[0.97]` | Buttons must feel responsive to press |
| `transform-origin: center` on popover | `origin-[var(--radix-popover-content-transform-origin)]` | Scale from trigger, not center |
| Animation on keyboard action | Remove animation entirely | Repeated 100x/day — animation adds delay |
| Duration > 300ms on UI element | Reduce to 150–250ms | Slow transitions feel broken |
| Hover without `@media (hover: hover)` guard | Add `@media (hover: hover) and (pointer: fine)` | Touch devices trigger hover on tap |
| Keyframes on rapidly-triggered element | CSS transitions for interruptibility | Keyframes restart from zero on interruption |
| Framer Motion `x`/`y` props under load | `transform: "translateX()"` string | Short-hand props are not hardware-accelerated |
| Same enter/exit speed | Exit faster than enter | Slow deliberate entry, snappy exit |
| All elements appear at once | Stagger 30–80ms between items | Cascading feels more natural |

## Full Reference

For detailed explanations, code examples, and Tailwind mappings, read the files listed in **Reference Documentation** above. Load only the specific rule files relevant to the current task to minimize token usage.
