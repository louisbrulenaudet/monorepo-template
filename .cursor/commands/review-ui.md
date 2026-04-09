# Review UI command

Run a **UI/UX-focused** review: Tailwind usage, responsive design, dark mode, accessibility (WCAG 2.2 AA), component patterns, layout stability, typography, color contrast, and motion (respecting reduced-motion). Your reply must be a **plan of suggested changes**: concise, actionable, and structured—not only prose.

## Cursor command usage

This file is a [Cursor custom command](https://docs.cursor.com/context/commands): plain Markdown in `.cursor/commands/`. When the user runs `/review-ui` in chat, this content is sent as the prompt.

- **Parameters:** Any text after `/review-ui` is scope—e.g. `/review-ui accessibility only`, `/review-ui contact form`—narrow accordingly. If none given, assume full UI review (styles, components, layouts, a11y, responsive, dark mode).

This command is project-scoped and works with @ mentions and Rules. For a full review use `/review` instead.

## Best practices alignment

- **Tailwind** — Utility-first; use theme tokens (colors, spacing, typography) from [apps/front-app/src/index.css](apps/front-app/src/index.css) and [apps/front-app/src/App.css](apps/front-app/src/App.css); avoid arbitrary values when a utility exists; consistent spacing scale.
- **Responsive** — Mobile-first; breakpoints (sm, md, lg) used consistently; no horizontal scroll on small viewports; touch targets at least 44×44px.
- **Dark mode** — All pages and components support dark theme; no hardcoded light-only colors; contrast and readability in both themes.
- **Layout stability** — No CLS from images (width/height or aspect-ratio); consistent typography scale; route or CSS transitions smooth and optional (respect prefers-reduced-motion).
- **Component patterns** — Consistent buttons, links, and form controls; loading and error states; no content-only reliance on color or shape.

Align with root [AGENTS.md](AGENTS.md) and app AGENTS.md for styling stack (Tailwind v4 with Vite, entry CSS under `front-app/src/`).

## Deep technical review

Conduct a UI-only review. Inspect the following and call out violations or improvements.

### Tailwind and theme usage

- **Artifacts:** [apps/front-app/src/index.css](apps/front-app/src/index.css), [apps/front-app/src/App.css](apps/front-app/src/App.css), [apps/front-app/src/App.tsx](apps/front-app/src/App.tsx), and any components under [apps/front-app/src/](apps/front-app/src/).
- **Checks:** Use `@theme` or Tailwind theme for colors and spacing; no raw hex/rgb outside theme unless justified. Utilities: prefer `text-primary`, `bg-surface`, `p-4`, etc., over arbitrary `text-[#fff]` or `p-[13px]`. Spacing: consistent scale (e.g. 4, 8, 16, 24). No one-off values that should be in theme. Typography: use theme font families and sizes; avoid inline font-size in px when a utility exists.

### Responsive design

- **Artifacts:** All components and views that layout content; [apps/front-app/src/](apps/front-app/src/).
- **Checks:** Mobile-first: base styles for mobile; sm/md/lg for larger. No horizontal overflow on viewport (no fixed min-width that breaks small screens). Grid/flex: wrap or stack on small; no cut-off or overlapping text. Touch targets: buttons and links at least 44×44px (or padding that achieves it). Breakpoints consistent across app (same meaning for md/lg).

### Dark mode

- **Artifacts:** [apps/front-app/src/index.css](apps/front-app/src/index.css) (theme variables), all components and views.
- **Checks:** Dark theme defined (e.g. `.dark` or `prefers-color-scheme: dark`); all surfaces and text use theme variables so they switch. No hardcoded light-only colors (e.g. `#fff` for background) that break dark mode. Images and borders: consider dark variants if needed. Contrast in dark mode meets same AA targets.

### Color contrast and readability

- **Artifacts:** Text and background color usage in entry CSS and components.
- **Checks:** Normal text: contrast ratio ≥ 4.5:1 against background. Large text (e.g. 18px+ or 14px+ bold): ≥ 3:1. Decorative elements and disabled text: document or ensure no critical info by color alone. Focus indicators: visible (e.g. 2px outline or ring) and sufficient contrast. No information conveyed by color only (use icon or text as well).

### Focus and keyboard

- **Artifacts:** Interactive UI in [apps/front-app/src/](apps/front-app/src/) (buttons, links, form controls, React event handlers).
- **Checks:** All interactive elements focusable (no `tabindex="-1"` without reason). Focus order logical (DOM order or explicit tabindex where needed). Visible focus style on every focusable element; no `outline: none` without a replacement (e.g. ring or border). Skip-to-content link at top for keyboard users. Modals or drawers: trap focus and return focus on close.

### Forms and validation UX

- **Artifacts:** Any forms or controlled inputs in [apps/front-app/src/](apps/front-app/src/) (add paths as the app grows).
- **Checks:** Every input has a visible label (or aria-label); labels associated (for/id or aria-labelledby). Validation: inline errors near field; error messages announced (aria-live or role="alert"). Submit disabled while submitting or when invalid. Required fields indicated (aria-required and/or visual). No placeholder-only labels (placeholder is hint, not label).

### Loading and error states

- **Artifacts:** Any async UI (fetch, mutations, suspense boundaries if used).
- **Checks:** Loading: spinner or skeleton; button shows loading state (disabled + text or icon). Error: message visible and not only in console; retry or recovery where appropriate. No blank state without feedback during load or error.

### Layout stability and images

- **Artifacts:** Image usage in [apps/front-app/src/](apps/front-app/src/) and [apps/front-app/public/](apps/front-app/public/); additional stylesheets if present.
- **Checks:** Images have width/height or aspect-ratio to prevent CLS. No layout shift when images load. Consistent spacing around media. Responsive images: srcset/sizes or appropriate max-width so they scale.

### View transitions and motion

- **Artifacts:** CSS and components in [apps/front-app/src/](apps/front-app/src/) (e.g. `transition-*`, animation libraries if added).
- **Checks:** Transitions are smooth and short; no jarring jumps. `prefers-reduced-motion: reduce`: disable or shorten animations (e.g. transition: none or duration 0). No motion that could trigger vestibular issues (e.g. large auto-playing motion).

### Component consistency

- **Artifacts:** Shared button/link patterns in [apps/front-app/src/](apps/front-app/src/); primary UI in [apps/front-app/src/App.tsx](apps/front-app/src/App.tsx) and child components.
- **Checks:** Buttons: consistent size, padding, and hover/focus states. Links: distinguishable (underline or color); focus style. Primary vs secondary actions visually clear. Same component or pattern for same purpose (e.g. one button style for CTAs).

### Anti-patterns to flag

- Raw hex colors or magic numbers instead of theme tokens.
- No dark mode support for a page or major component.
- Contrast below 4.5:1 for body text.
- outline: none with no visible focus replacement.
- Form inputs without proper labels or error association.
- Horizontal scroll on mobile; touch targets under 44px.
- Images without dimensions causing layout shift.
- Motion that doesn’t respect prefers-reduced-motion.
- Inconsistent button/link styles across the app.

## Steps

1. **Gather scope** — Full UI or specific area (a11y, responsive, dark mode, forms, transitions). Default to full.
2. **Read conventions** — AGENTS.md for Tailwind and Vite/CSS entry usage.
3. **Inspect theme and Tailwind** — index.css / App.css theme; component class usage; arbitrary values and consistency.
4. **Inspect responsive** — Breakpoints, overflow, touch targets across key pages.
5. **Inspect dark mode** — Theme variables and coverage across the app.
6. **Inspect accessibility** — Contrast, focus, labels, skip link, reduced-motion.
7. **Inspect forms and states** — Forms and any async UI; loading and error handling.
8. **Inspect layout and motion** — Image dimensions, CSS transitions, reduced-motion.
9. **Compose plan** — Critical / Improvements / Optional; each item: **what**, **where**, **why**. One-line "no issues" per sub-area if none.

## Checklist

- [ ] Scope clear
- [ ] AGENTS.md consulted for styling stack
- [ ] Tailwind and theme usage reviewed
- [ ] Responsive design and touch targets reviewed
- [ ] Dark mode coverage reviewed
- [ ] Color contrast and focus (WCAG 2.2 AA) reviewed
- [ ] Forms and validation UX reviewed
- [ ] Loading and error states reviewed
- [ ] Layout stability and motion reviewed
- [ ] Component consistency reviewed
- [ ] Plan structured as Critical / Improvements / Optional with what/where/why

## Context usage

- Use `@file` for index.css, App.css, App.tsx, and component files under `front-app/src/`.
- Use `@code` for specific class names or style blocks when suggesting changes.
- Use `@docs` or `@web` for WCAG 2.2 and Tailwind v4 when checking guidelines.

If context is insufficient, suggest which files or @ references to add.

## Review checklist

- **Correctness:** Contrast and focus behavior are correct; no broken layouts.
- **Conventions:** Matches AGENTS.md (Tailwind v4 with Vite, mobile-first).
- **Quality:** Usable and accessible; consistent and stable layout.
- **Actionability:** Every suggestion is implementable (e.g. "add width/height to image", "use theme color for background").
- **Trade-offs:** Note any (e.g. animation vs reduced-motion).
- **Scope:** UI/UX only; defer SEO or performance to their reviews.

## Output format

Respond with a **plan** only (no implementation unless the user asks):

1. **Critical** – Must-fix (contrast failure, missing focus style, form without labels, horizontal scroll on mobile, no dark mode for key page).
2. **Improvements** – Worthwhile (theme tokens instead of raw values, skip link, loading state, reduced-motion support).
3. **Optional** – Nice-to-haves (consistent button variants, transition polish). Prefix with **Nit:** for non-blocking polish.

For each item: **what** to change, **where** (file/area), and **why**. If a sub-area has no findings, state it in one line.
