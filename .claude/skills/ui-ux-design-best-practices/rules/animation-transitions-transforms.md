---
title: CSS Transitions, @starting-style, and Transform Mastery
impact: HIGH
impactDescription: correct use of transitions vs keyframes and transforms prevents jank and enables smooth interruptible animations
tags: animation, transitions, keyframes, starting-style, transform, translateY, scale, GPU
---

## CSS Transitions, `@starting-style`, and Transform Mastery

### CSS Transitions vs Keyframes for Dynamic UI

**Use CSS transitions for interruptible UI.** CSS transitions can be retargeted mid-animation. Keyframes restart from zero. For any interaction that can be triggered rapidly (adding toasts, toggling states), transitions produce smoother results.

```css
/* Interruptible — correct for UI */
.toast {
  transition: transform 400ms ease;
}

/* Not interruptible — avoid for dynamic UI */
@keyframes slideIn {
  from { transform: translateY(100%); }
  to   { transform: translateY(0); }
}
```

```html
<!-- Tailwind v4: transition-based (interruptible) -->
<div class="translate-y-full opacity-0
            transition-[transform,opacity] duration-400 ease-out
            data-visible:translate-y-0 data-visible:opacity-100">

<!-- Animation-based: avoid for rapidly-triggered elements -->
<div class="animate-slide-up">
```

**Use keyframes when:** the animation is decorative, plays once, and will not be interrupted.

### `@starting-style` Entry Animations

The modern CSS way to animate element entry without JavaScript:

```css
.toast {
  opacity: 1;
  transform: translateY(0);
  transition: opacity 400ms ease, transform 400ms ease;

  @starting-style {
    opacity: 0;
    transform: translateY(100%);
  }
}
```

```html
<!-- Tailwind v4 via starting: variant -->
<div class="opacity-100 translate-y-0
            transition-[transform,opacity] duration-400 ease-out
            starting:opacity-0 starting:translate-y-full
            motion-reduce:starting:translate-y-0 motion-reduce:transition-opacity">
```

This replaces the common React `useEffect(() => setMounted(true), [])` pattern. Use `@starting-style` when browser support allows.

### CSS Transform Mastery

#### `translateY` with percentages

Percentage values in `translate()` are relative to the element's own size. Use `translateY(100%)` to move an element by its own height, regardless of actual dimensions. This is how drawers and toasts hide before animating in.

```css
/* Works regardless of drawer height */
.drawer-hidden { transform: translateY(100%); }
```

```html
<!-- Tailwind v4 -->
<div class="translate-y-full">  <!-- 100% of own height -->
<div class="-translate-y-full"> <!-- -100% of own height -->
<div class="translate-x-1/2">  <!-- 50% of own width -->
```

Prefer percentages over hardcoded pixel values. They adapt to content.

#### `scale()` scales children too

Unlike `width`/`height`, `scale()` also scales an element's children. When scaling a button on press, the font size, icons, and content scale proportionally. This is a feature, not a bug.

#### GPU acceleration

```html
<!-- Tailwind v4 -->
<div class="scale-150 transform-gpu">    <!-- Force GPU compositing -->
<div class="animate-spin transform-gpu"> <!-- Smooth spinner -->
```
