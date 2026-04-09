---
title: Animation Decision Framework
impact: HIGH
impactDescription: prevents unnecessary animations that degrade perceived performance and add cognitive load
tags: animation, decisions, easing, duration, performance, philosophy
---

## Animation Decision Framework

Design philosophy and technical decision process for motion that feels intentional. Every animation must justify its existence through frequency, purpose, easing, and duration.

### Core Philosophy

**Unseen details compound.** Most details users never consciously notice. That is the point. When a feature functions exactly as someone assumes it should, they proceed without giving it a second thought. That is the goal.

Every animation decision exists because the aggregate of invisible correctness creates interfaces people love without knowing why.

**Beauty is leverage.** People select tools based on the overall experience, not just functionality. Intentional motion is a real differentiator.

### Step 1: Should this animate at all?

**Ask:** How often will users see this animation?

| Frequency | Decision |
|---|---|
| 100+ times/day (keyboard shortcuts, command palette toggle) | No animation — ever |
| Tens of times/day (hover effects, list navigation) | Remove or drastically reduce |
| Occasional (modals, drawers, toasts) | Standard animation |
| Rare / first-time (onboarding, feedback forms, celebrations) | Can add delight |

**Never animate keyboard-initiated actions.** These repeat hundreds of times daily. Animation makes them feel slow, delayed, and disconnected from the user's input. A command palette with an open/close animation should remove that animation.

### Step 2: What is the purpose?

Every animation must have a clear answer to "why does this animate?"

Valid purposes:

- **Spatial consistency** — toast enters and exits from the same direction, making swipe-to-dismiss feel intuitive
- **State indication** — a morphing button shows a state change has occurred
- **Explanation** — a marketing animation shows how a feature works
- **Feedback** — a button scales on press, confirming the interface heard the user
- **Preventing jarring changes** — elements appearing or disappearing without transition feel broken

If the purpose is just "it looks cool" and the user will see it often, do not animate.

### Step 3: What easing should it use?

```
Is the element entering or exiting?
  Yes → ease-out (starts fast, feels responsive)
  No →
    Is it moving or morphing on screen?
      Yes → ease-in-out (natural acceleration/deceleration)
    Is it a hover or color change?
      Yes → ease (default) or linear
    Is it constant motion (spinner, marquee, progress)?
      Yes → linear
    Default → ease-out
```

**Never use `ease-in` for UI animations.** It starts slow — the exact moment the user is watching most closely. A dropdown with `ease-in` at 300ms *feels* slower than `ease-out` at the same 300ms because the delay is at the start.

**Use custom easing curves.** The built-in CSS easings are too gentle. They lack the punch that makes animations feel intentional.

```css
/* Register in @theme for Tailwind access */
@theme {
  /* Strong ease-out for UI interactions */
  --ease-out-strong:    cubic-bezier(0.23, 1, 0.32, 1);

  /* Strong ease-in-out for on-screen movement */
  --ease-in-out-strong: cubic-bezier(0.77, 0, 0.175, 1);

  /* iOS-like drawer curve */
  --ease-drawer:        cubic-bezier(0.32, 0.72, 0, 1);
}
```

```html
<!-- Tailwind v4 — use via CSS variable shorthand -->
<div class="ease-(--ease-out-strong)">
<div class="ease-(--ease-in-out-strong)">
<div class="ease-(--ease-drawer)">

<!-- Or inline arbitrary value -->
<div class="ease-[cubic-bezier(0.23,1,0.32,1)]">
```

Resources for strong custom curves: [easing.dev](https://easing.dev/) and [easings.co](https://easings.co/).

### Step 4: How fast should it be?

| Element | Duration |
|---|---|
| Button press feedback | 100–160ms |
| Tooltips, small popovers | 125–200ms |
| Dropdowns, selects | 150–250ms |
| Modals, drawers | 200–500ms |
| Marketing / explanatory | Can be longer |

**UI animations should stay under 300ms.** A 180ms dropdown feels more responsive than a 400ms one. Faster UI makes the whole app feel faster — not just the animation.

### Perceived Performance

Speed in animation is not just about feeling snappy — it directly affects how users perceive the app's performance:

- A fast-spinning spinner makes loading feel faster (same load time, different perception)
- A 180ms select animation feels more responsive than a 400ms one
- Tooltips that open instantly after the first one is open make the whole toolbar feel faster

Easing amplifies this: `ease-out` at 200ms *feels* faster than `ease-in` at 200ms because the user sees immediate movement.
