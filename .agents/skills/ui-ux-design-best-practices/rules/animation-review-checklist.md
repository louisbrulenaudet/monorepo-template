---
title: Component Design Principles, Debugging, and Review Checklist
impact: MEDIUM
impactDescription: systematic review catches the most common animation mistakes before they ship
tags: animation, review, checklist, debugging, principles, slow-motion, testing
---

## Component Design Principles, Debugging, and Review Checklist

### Component Design Principles

These principles apply to any interactive component:

1. **Developer experience.** Minimize setup friction. The less friction to adopt, the more it will be used.

2. **Good defaults matter more than options.** Ship beautiful out of the box. Most users never customize. The default easing, timing, and visual design should be excellent.

3. **Handle edge cases invisibly.** Pause timers when the tab is hidden. Fill gaps between stacked elements with pseudo-elements to maintain hover state. Capture pointer events during drag. Users never notice these, and that is exactly right.

4. **Use transitions, not keyframes, for dynamic UI.** Elements added rapidly need interruptible transitions — keyframes restart from zero on interruption.

5. **Cohesion matters.** The whole experience should be cohesive. The easing and duration should fit the personality of the component. A playful component can be bouncier. A professional dashboard should be crisp and fast. Match the motion to the mood.

6. **The opacity + height combination.** When items enter and exit a list, the opacity change must work well with the height animation. There is no formula — adjust until it feels right.

### Debugging Animations

#### Slow motion testing

Temporarily multiply durations by 5–10x, or use Chrome DevTools' Animations panel to slow playback. Things to look for:

- Do colors transition smoothly, or are there two distinct states overlapping?
- Does the easing feel right, or does it start/stop abruptly?
- Is `transform-origin` correct, or does the element scale from the wrong point?
- Are multiple animated properties (opacity, transform, color) in sync?

#### Frame-by-frame inspection

Step through animations frame by frame in Chrome DevTools (Animations panel). This reveals timing issues between coordinated properties invisible at full speed.

#### Test on real devices

For touch interactions (drawers, swipe gestures), test on physical devices. Connect via USB, visit local dev server by IP address, and use remote devtools. The Xcode Simulator is an alternative but real hardware is better for gesture testing.

#### Review with fresh eyes

Review animations the next day. You notice imperfections then that were invisible during development. Play animations in slow motion or frame by frame to spot timing issues at full speed.

### Review Checklist

When reviewing UI code, check for:

| Issue | Fix |
|---|---|
| `transition: all` | Specify exact: `transition: transform 200ms ease-out` |
| `scale(0)` entry animation | Start from `scale(0.95)` with `opacity: 0` |
| `ease-in` on UI element | Switch to `ease-out` or custom curve |
| `transform-origin: center` on popover | Set to trigger location or use Radix/Base UI CSS variable (modals exempt) |
| Animation on keyboard action | Remove animation entirely |
| Duration > 300ms on UI element | Reduce to 150–250ms |
| Hover animation without media query | Add `@media (hover: hover) and (pointer: fine)` |
| Keyframes on rapidly-triggered element | Use CSS transitions for interruptibility |
| Framer Motion `x`/`y` props under load | Use `transform: "translateX()"` for hardware acceleration |
| Same enter/exit transition speed | Make exit faster than enter |
| Elements all appear at once | Add stagger delay (30–80ms between items) |
| `transition-all` | Specify `transition-transform` or `transition-[transform,opacity]` |
| `animate-spin` directly on `<svg>` | Wrap in `<div class="animate-spin">` — SVG lacks GPU acceleration |
| `blur-2xl` in animations | Keep at `blur-xs` or `blur-sm`; heavy blur is expensive in Safari |
| `will-change-transform` everywhere | Last resort only; over-use degrades performance |
