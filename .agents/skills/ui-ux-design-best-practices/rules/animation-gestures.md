---
title: Gesture and Drag Interactions
impact: MEDIUM
impactDescription: makes drag and swipe feel natural and physically believable on touch devices
tags: animation, gestures, drag, swipe, momentum, damping, pointer-capture, touch
---

## Gesture and Drag Interactions

### Momentum-based dismissal

Do not require dragging past a threshold. Calculate velocity:

```js
const timeTaken = new Date().getTime() - dragStartTime.current.getTime();
const velocity = Math.abs(swipeAmount) / timeTaken;

if (Math.abs(swipeAmount) >= SWIPE_THRESHOLD || velocity > 0.11) {
  dismiss();
}
```

A quick flick should be enough — even if the drag distance is small.

### Damping at boundaries

When a user drags past the natural boundary (e.g., dragging a drawer up when already at top), apply damping. The more they drag, the less the element moves. Things in real life do not suddenly stop — they slow down first.

```js
// Damping formula: progressively resist movement past boundary
const dampedDistance = distance > 0
  ? Math.min(distance, boundary + (distance - boundary) * 0.2)
  : distance;
```

### Pointer capture for drag

Once dragging starts, set the element to capture all pointer events. This ensures dragging continues even if the pointer leaves the element bounds.

```js
element.setPointerCapture(event.pointerId);
```

### Multi-touch protection

Ignore additional touch points after the initial drag begins. Without this, switching fingers mid-drag causes the element to jump.

```js
function onPointerDown(e) {
  if (isDragging) return; // Ignore additional touch points
  isDragging = true;
  // ...
}
```

### Friction instead of hard stops

Allow movement past boundaries with increasing friction. It feels more natural than hitting an invisible wall.

Use the damping formula above and increase the resistance factor (0.2) to taste. A factor of 0.1 means only 10% of movement past the boundary is applied — strong friction. A factor of 0.5 is lighter.
