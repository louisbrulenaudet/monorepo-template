---
paths:
  - "apps/front-*/src/**/*.{ts,tsx,css}"
  - "apps/front-*/index.html"
---

# Tailwind CSS v4

CSS-first v4: there is no `tailwind.config.js` / `postcss.config.js`. Motion and interaction depth: skill `ui-ux-design-best-practices`. Lint configuration: [lint-config.md](../quality/lint-config.md).

## Engine and source detection

- Single entry `@import "tailwindcss";` in `src/index.css` (canonical: `apps/front-app/src/index.css`), built by `@tailwindcss/vite` with Lightning CSS built in - no Autoprefixer/PostCSS step. Plugin order: [vite-config.md](vite-config.md).
- v4 detects sources automatically from the build's working directory (per app here), skipping `.gitignore`, `node_modules`, binaries, CSS, and lockfiles. The current `@source "../index.html"` + `@source "./**/*.{ts,tsx}"` defensively restate that default; keep them so detection stays cwd-independent.
- Register a workspace package only when it ships Tailwind classes this app renders, pointing at its real source (`@source "../../../packages/<pkg>/src";`), not the `node_modules` symlink. `@repo/dtos-common` / `@repo/enums-common` are class-free: never add them.
- `@source not "<path>";` excludes a large non-Tailwind directory. `@source inline("...")` safelists classes that never appear as literals - a last resort; prefer static strings.

## Tokens: `@theme` vs `:root`

- `@theme` only for a value that must generate a utility or variant, i.e. one in a Tailwind namespace (`--color-*`, `--spacing-*`, `--font-*`, `--radius-*`, `--shadow-*`, `--ease-*`, `--animate-*`, `--breakpoint-*`). `@theme` is top-level only (no nesting under selectors or media). Every other custom property stays in plain `:root` (e.g. `--health-glow-color`).
- `@keyframes` for an `--animate-*` token nest inside `@theme`, so they travel with the token.
- `@theme inline` when a token's value is itself a `var(...)` (semantic theming), so the utility resolves per scope instead of baking in one value.
- Font stacks are tokens (`@theme { --font-sans: ... }`, which preflight applies to `html`), never `font-family` on `:root`.

## Theming and dark mode

- Never hardcode a single-theme palette: `text-slate-200` / `bg-white/5` assume one background and become unreadable on the other scheme. With `color-scheme: light dark`, colors must adapt in both.
- Pattern: raw values in `:root` plus a dark scope, re-exposed as semantic `@theme inline` tokens that components use in both themes; add `--card` / `--border` / `--muted-foreground` / `--primary` the same way:
  ```css
  :root { --background: oklch(1 0 0); --foreground: oklch(0.145 0 0); }
  @media (prefers-color-scheme: dark) {
    :root { --background: oklch(0.13 0 0); --foreground: oklch(0.985 0 0); }
  }
  @theme inline {
    --color-background: var(--background);
    --color-foreground: var(--foreground);
  }
  ```
- `dark:` follows `prefers-color-scheme`. A manual class/attribute toggle declares the strategy once: `@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));`.

## Custom styles

- `@apply` lives only in the global `index.css`, base element styles in `@layer base`; no per-feature `.css` files that `@apply`.
- `@layer base` holds true global resets only (`body`, `a`, …). App-shell layout (the `max-w-*` / `p-8` wrapper) and per-page type sizing are JSX utilities - the shell on the `RootLayout` wrapper in `__root.tsx`, heading sizes on the page's `<h1>` - never `#root` / `h1` rules in base CSS.
- New reusable utilities → `@utility name { ... }` (works with variants); new variants → `@custom-variant`.
- A separately bundled stylesheet (CSS module, scoped `<style>`) that uses `@apply` / `@variant` must first `@reference "<entry>.css";` - but prefer plain `var(--color-*)` there, because `@reference` reprocesses the file and slows builds.

## Classes in components

- Utilities in JSX; factor repetition into `src/components/ui/` primitives composed with `cx()` (see `Button.tsx`, `Card.tsx`).
- Variants are a `Record<Variant, string>` of complete, static class strings. Never build a class by interpolation (`` `bg-${color}-500` ``): the scanner reads source as plain text and will not emit it.
- A runtime value goes in `style` as a CSS variable, consumed with the v4 parentheses shorthand: `className="bg-(--brand)"` (= `bg-[var(--brand)]`; not v3 `bg-[--brand]`).
- **Every `className` token must be a Tailwind utility or a `@theme` token** - `no-unknown-classes` rejects typos, hallucinated utilities, and raw CSS class names; introduce a semantic token or an `@utility` instead. Use the canonical shorthands the linter enforces (`size-2.5`, not `h-2.5 w-2.5`); `pnpm lint:fix` fixes the fixable ones, and `oxfmt` owns class order.
