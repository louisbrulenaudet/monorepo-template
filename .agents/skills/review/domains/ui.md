---
id: ui
summary: Tailwind v4 tokens and theming, dark mode, WCAG 2.2 AA accessibility, keyboard and focus, forms, loading and error states, motion
model: sonnet
---

# UI

Does the SPA work for everyone in both color schemes, on every viewport and input method, and use the design tokens and components the way the Tailwind rule says?

## Ground truth

- Rules: [frontend/tailwind](../../../../.claude/rules/frontend/tailwind.md), [frontend/react](../../../../.claude/rules/frontend/react.md), [quality/lint-config](../../../../.claude/rules/quality/lint-config.md) (`no-unknown-classes`, `jsx-a11y`).
- Skill `ui-ux-design-best-practices`: [rules/animation-review-checklist.md](../../ui-ux-design-best-practices/rules/animation-review-checklist.md), [rules/tailwind-variants.md](../../ui-ux-design-best-practices/rules/tailwind-variants.md), [rules/animation-accessibility-stagger.md](../../ui-ux-design-best-practices/rules/animation-accessibility-stagger.md).
- External, retrieved before citing: [WCAG 2.2](https://www.w3.org/TR/WCAG22/) and its Understanding pages.

## Scope

`apps/front-*/src/**` (`.tsx`, `index.css`), `apps/front-*/index.html`, `apps/front-*/src/components/ui/**`. A path or component focus narrows to it.

## Probe

`pnpm react-doctor design --verbose`, `pnpm lint:agent` (read `no-unknown-classes` and `jsx-a11y` lines). When dev servers are **already** running (never start them): the `playwright-cli` snapshot and console loop from skill `run-app`, in both color schemes and at a phone viewport.

## Axes

- **Tokens and theming**: raw values in `:root` plus a dark scope, re-exposed as semantic `@theme inline` tokens; `@theme` only for values that must generate a utility; no single-theme palette (`text-slate-200`, `bg-white/5`) that breaks on the other scheme; `dark:` follows `prefers-color-scheme`, or one `@custom-variant dark` for a manual toggle; `color-scheme` declared.
- **Classes**: every `className` token a utility or `@theme` token; variants are `Record<Variant, string>` of complete static strings composed with `cx()`, never interpolated; runtime values through a CSS variable and `bg-(--x)`; `@apply` only in `index.css`; shared primitives in `src/components/ui/` reused rather than restyled per page.
- **Contrast and color**: text ≥ 4.5:1 (large text ≥ 3:1) and UI components and focus indicators ≥ 3:1, checked in **both** themes; no information by color alone.
- **Keyboard and focus**: every interactive element reachable and operable by keyboard, in DOM order; a visible focus indicator (no `outline: none` without a replacement) that is not hidden behind sticky headers or overlays (2.4.11); dialogs and drawers trap and restore focus; a skip link once there is repeated navigation.
- **Targets and input**: pointer targets at least 24×24 CSS px or spaced enough (2.5.8 AA; 44×44 is AAA, not a finding); any drag interaction has a single-pointer alternative (2.5.7); hover-only affordances have a touch and keyboard equivalent.
- **Semantics**: one `h1` per view and headings in order; landmarks (`header`, `nav`, `main`, `footer`); native elements over `div` + handlers; meaningful `alt`, empty `alt` for decoration; icon-only buttons labelled.
- **Forms**: every input has a programmatic label (not placeholder-only); errors next to the field and announced (`aria-live` / `role="alert"`); required fields marked; no re-entry of data already given in the same flow (3.3.7); authentication, once added, allows paste and password managers and has no cognitive-test-only step (3.3.8); help in a consistent place (3.2.6).
- **States**: loading (skeleton or pending component), empty, and error states visible for every async view; the error screen shows the `requestId` the gateway returns; a submit button reflects pending state.
- **Responsive and layout**: mobile-first; no horizontal scroll at 320 CSS px (1.4.10); media reserve space.
- **Motion**: animate `transform` / `opacity` only; UI transitions under about 300 ms; every animation honors `prefers-reduced-motion` (`motion-reduce:`); no auto-playing large motion.
- **Clickjacking**: `frame-ancestors` matters only once a state-changing action exists in the SPA.

## Critical when

A text or focus-indicator contrast failure in either theme; a control unreachable or inoperable by keyboard; a form input with no programmatic label; content unreadable in one color scheme; horizontal scroll on a phone viewport; motion that ignores `prefers-reduced-motion`.

## Overlaps

Core Web Vitals, image dimensions, and CLS belong to `performance`; per-route `<title>` and meta to `seo`; CSP and `frame-ancestors` headers to `security`; Tailwind and React configuration to `review-stack tailwind` / `review-stack react`. This domain owns headings, alt text, and landmarks.

## Accepted

- CSS-first Tailwind v4 with no config file, and the `@source` lines restating the default: rule [frontend/tailwind](../../../../.claude/rules/frontend/tailwind.md).
