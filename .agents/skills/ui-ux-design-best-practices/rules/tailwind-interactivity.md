---
title: Tailwind v4 — Interactivity Utilities
impact: MEDIUM
impactDescription: will-change, pointer-events, cursor, and select control how the browser and user interact with elements during and after animation
tags: tailwind, interactivity, will-change, pointer-events, cursor, user-select, drag
---

## Tailwind v4 — Interactivity Utilities

> Source: https://tailwindcss.com/docs

### `will-change`

Docs: https://tailwindcss.com/docs/will-change

| Class | Output |
|---|---|
| `will-change-auto` | `will-change: auto` |
| `will-change-scroll` | `will-change: scroll-position` |
| `will-change-contents` | `will-change: contents` |
| `will-change-transform` | `will-change: transform` |
| `will-change-[<value>]` | Arbitrary value |

**Use sparingly.** `will-change` is a last-resort hint for known bottlenecks. Over-applying degrades performance by creating unnecessary compositing layers.

```html
<!-- Only apply when you know an element will animate soon -->
<div class="will-change-transform hover:scale-105 transition-transform">

<!-- Remove after animation (use JS to add/remove class or reset to will-change-auto) -->
```

### `pointer-events`

Docs: https://tailwindcss.com/docs/pointer-events

| Class | Output |
|---|---|
| `pointer-events-none` | `pointer-events: none` |
| `pointer-events-auto` | `pointer-events: auto` |

```html
<!-- Icon overlay that passes clicks through to input -->
<div class="relative">
  <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
    <svg class="h-5 w-5 text-gray-400">...</svg>
  </div>
  <input class="pl-10" type="text" />
</div>

<!-- Disabled overlay during loading -->
<div class="pointer-events-none opacity-50" aria-disabled="true">
  <form>...</form>
</div>
```

### `cursor`

Docs: https://tailwindcss.com/docs/cursor

```html
<button class="cursor-pointer">          Normal button     </button>
<button class="cursor-progress">         Saving...         </button>
<button class="cursor-not-allowed" disabled> Disabled      </button>
<div class="cursor-grab active:cursor-grabbing"> Drag me   </div>
<input class="cursor-text">              Text input        </input>
```

### `user-select`

Docs: https://tailwindcss.com/docs/user-select

```html
<!-- Prevent accidental selection on interactive elements -->
<button class="select-none">Click me</button>

<!-- Allow selection on content -->
<p class="select-text">Readable content</p>

<!-- Code token / API key (select all on click) -->
<code class="select-all">sk-prod-abc123xyz</code>
```

Always add `select-none` to draggable elements and buttons that respond to `:active` — without it, rapid clicks or drags will select text.
