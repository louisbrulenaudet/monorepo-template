---
title: Animation Performance Rules
impact: HIGH
impactDescription: animating the wrong properties causes layout thrashing and dropped frames; these rules keep animations on the GPU
tags: animation, performance, GPU, transform, opacity, CSS-variables, framer-motion, WAAPI, hardware-acceleration
---

## Animation Performance Rules

### Only animate `transform` and `opacity`

These properties skip layout and paint, running on the GPU. Animating `padding`, `margin`, `height`, or `width` triggers all three rendering steps.

```html
<!-- Correct: GPU-accelerated -->
<div class="transition-[transform,opacity] duration-300">

<!-- Avoid: triggers layout -->
<div class="transition-[height,padding] duration-300">
```

### CSS variables are inheritable — update transform directly

Changing a CSS variable on a parent recalculates styles for all children. In a drawer with many items, updating `--swipe-amount` on the container causes expensive style recalculation. Update `transform` directly on the element instead.

```js
// Bad: triggers recalc on all children
element.style.setProperty('--swipe-amount', `${distance}px`);

// Good: only affects this element
element.style.transform = `translateY(${distance}px)`;
```

### Framer Motion hardware acceleration

Framer Motion's shorthand properties (`x`, `y`, `scale`) use `requestAnimationFrame` on the main thread — they are **not** hardware-accelerated. For GPU acceleration, use the full `transform` string:

```jsx
// NOT hardware accelerated — drops frames under load
<motion.div animate={{ x: 100 }} />

// Hardware accelerated — stays smooth even when main thread is busy
<motion.div animate={{ transform: "translateX(100px)" }} />
```

This matters when the browser is simultaneously loading content, running scripts, or painting.

### CSS animations beat JS under load

CSS animations run off the main thread. When the browser is busy loading a new page, JS-based animations (using `requestAnimationFrame`) drop frames. CSS animations remain smooth. Use CSS for predetermined animations; JS for dynamic, interruptible ones.

### Use WAAPI for programmatic CSS animations

The Web Animations API gives JavaScript control with CSS performance — hardware-accelerated, interruptible, no library needed.

```js
element.animate(
  [
    { clipPath: 'inset(0 0 100% 0)', opacity: 0 },
    { clipPath: 'inset(0 0 0 0)',    opacity: 1 }
  ],
  {
    duration: 300,
    fill: 'forwards',
    easing: 'cubic-bezier(0.77, 0, 0.175, 1)',
  }
);
```
