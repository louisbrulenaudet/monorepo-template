---
title: Spring Animations
impact: MEDIUM
impactDescription: creates natural, physics-based motion that feels alive and handles gesture interruption gracefully
tags: animation, springs, framer-motion, gestures, physics, interruptibility
---

## Spring Animations

Springs feel more natural than duration-based animations because they simulate real physics. They do not have fixed durations — they settle based on physical parameters.

### When to use springs

- Drag interactions with momentum
- Elements that should feel "alive"
- Gestures that can be interrupted mid-animation
- Decorative mouse-tracking interactions

### Spring configuration (Framer Motion / Motion)

**Apple's approach (recommended — easier to reason about):**

```js
{ type: "spring", duration: 0.5, bounce: 0.2 }
```

**Traditional physics (more control):**

```js
{ type: "spring", mass: 1, stiffness: 100, damping: 10 }
```

Keep `bounce` subtle (0.1–0.3) when used. Avoid bounce in most UI contexts. Use it for drag-to-dismiss and playful interactions.

### Spring-based mouse interactions

Tying visual changes directly to mouse position feels artificial because it lacks motion. Use `useSpring` from Motion to interpolate value changes with spring-like behavior:

```jsx
import { useSpring } from 'framer-motion';

// Without spring: feels artificial, instant
const rotation = mouseX * 0.1;

// With spring: feels natural, has momentum
const springRotation = useSpring(mouseX * 0.1, {
  stiffness: 100,
  damping: 10,
});
```

This works because the animation is **decorative** — it does not serve a function. If this were a functional graph in a data-heavy app, no animation would be better. Know when decoration helps and when it hinders.

### Interruptibility advantage

Springs maintain velocity when interrupted — CSS animations and keyframes restart from zero. This makes springs ideal for gestures users might change mid-motion.

Use springs when a user might reverse direction before the animation completes (e.g., swiping a drawer partially then releasing).
