---
title: clip-path for Animation
impact: MEDIUM
impactDescription: enables creative reveal animations, hold-to-confirm patterns, and seamless tab color transitions not achievable with standard transitions
tags: animation, clip-path, inset, hold-to-delete, tab-transitions, scroll-reveal, comparison-slider
---

## `clip-path` for Animation

`clip-path` is not just for shapes — it is one of the most powerful animation tools in CSS.

### The `inset` shape

`clip-path: inset(top right bottom left)` defines a rectangular clipping region. Each value "eats" into the element from that side.

```css
/* Fully hidden from right */
.hidden { clip-path: inset(0 100% 0 0); }

/* Fully visible */
.visible { clip-path: inset(0 0 0 0); }

/* Reveal from left to right */
.overlay {
  clip-path: inset(0 100% 0 0);
  transition: clip-path 200ms ease-out;
}
.button:active .overlay {
  clip-path: inset(0 0 0 0);
  transition: clip-path 2s linear;
}
```

```html
<!-- Tailwind v4 with arbitrary values -->
<div class="[clip-path:inset(0_100%_0_0)]
            transition-[clip-path] duration-200 ease-out
            group-active:[clip-path:inset(0_0_0_0)]
            group-active:duration-[2s] group-active:ease-linear">
```

### Hold-to-delete / hold-to-confirm pattern

Use `clip-path: inset(0 100% 0 0)` on a colored overlay. On `:active`, transition to `inset(0 0 0 0)` over 2s with linear timing. On release, snap back with 200ms ease-out. Combine with `scale(0.97)` on press for feedback.

```css
.button { transition: transform 160ms ease-out; }
.button:active { transform: scale(0.97); }

.overlay {
  clip-path: inset(0 100% 0 0);
  transition: clip-path 200ms ease-out; /* Release: fast */
}
.button:active .overlay {
  clip-path: inset(0 0 0 0);
  transition: clip-path 2s linear; /* Press: slow and deliberate */
}
```

### Tab color transitions

Duplicate the tab list. Style the copy as "active" (different background, different text color). Clip the copy so only the active tab is visible. Animate the clip on tab change. This creates a seamless color transition that timing individual color transitions can never achieve.

### Image reveals on scroll

```js
// IntersectionObserver-based reveal
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('revealed')
      observer.unobserve(entry.target)
    }
  })
}, { threshold: 0.1, rootMargin: '-100px' })
```

```css
.reveal {
  clip-path: inset(0 0 100% 0);
  transition: clip-path 600ms cubic-bezier(0.77, 0, 0.175, 1);
}
.reveal.revealed {
  clip-path: inset(0 0 0 0);
}
```

### Comparison sliders

Overlay two images. Clip the top one with `clip-path: inset(0 50% 0 0)`. Adjust the right inset value based on drag position. No extra DOM elements needed, fully hardware-accelerated.
