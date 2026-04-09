# Review SEO command

Run an **SEO-focused** review: meta tags, Open Graph, canonical URLs, structured data, sitemap, RSS, robots, crawlability, Core Web Vitals, heading hierarchy, and optional bot/LLM surfaces when implemented. Your reply must be a **plan of suggested changes**: concise, actionable, and structured—not only prose.

## Cursor command usage

This file is a [Cursor custom command](https://docs.cursor.com/context/commands): plain Markdown in `.cursor/commands/`. When the user runs `/review-seo` in chat, this content is sent as the prompt.

- **Parameters:** Any text after `/review-seo` is scope—e.g. `/review-seo meta only`, `/review-seo public assets`—narrow accordingly. If none given, assume full SEO review (meta, structured data, feeds, CWV, headings; optional items when present).

This command is project-scoped and works with @ mentions and Rules. For a full review use `/review` instead.

## Best practices alignment

- **Meta and crawlability** — Every document view has an appropriate `<title>` and meta description; Open Graph and Twitter Card where relevant; canonical URL set for multi-URL content; no duplicate content without canonical.
- **Structured data** — JSON-LD for key entity types when used (e.g. WebSite, WebApplication); valid and minimal; no conflicting or empty required fields.
- **Feeds and discovery** — When sitemap/RSS/robots exist: complete and valid; lastmod accurate; robots.txt allow/disallow correct; humans.txt and llms.txt where documented.
- **Core Web Vitals** — LCP, INP, CLS within targets (e.g. LCP &lt; 2.5s, CLS &lt; 0.1); critical path and layout stability (dimensions, fonts) support good metrics.
- **Semantic and headings** — Single h1 per logical page; logical heading hierarchy (h1 → h2 → h3, no skips); semantic HTML (article, nav, main); alt text on all meaningful images.
- **Bot experience** — Optional: markdown/plain-text or edge behavior for crawlers/LLMs when implemented; consistent with crawlability goals.

Align with root [AGENTS.md](AGENTS.md) and app AGENTS.md for content and routing.

## Deep technical review

Conduct an SEO-only review. Inspect the following and call out violations or improvements.

### Meta tags and Open Graph

- **Artifacts:** [apps/front-app/index.html](apps/front-app/index.html); any head management in React (e.g. `react-helmet-async` or similar if added); config modules under [apps/front-app/src/](apps/front-app/src/) when present.
- **Checks:** Each route or view has an appropriate `<title>` (no generic default for all). Meta description where used: unique per route and within length (e.g. ~155 chars). og:title, og:description, og:url (canonical), og:type set when OG is used; og:image with absolute URL and recommended dimensions (e.g. 1200×630) when applicable. Twitter Card meta if used. Canonical link points to the preferred URL (including trailing slash policy if any).

### Structured data (JSON-LD)

- **Artifacts:** Any layout or component that injects JSON-LD (when present).
- **Checks:** WebSite and/or WebApplication where relevant; article types when you have articles. No invalid or empty required properties. Script type application/ld+json; valid JSON; no duplicate @id. Optional: BreadcrumbList for deeper routes.

### Sitemap and RSS

- **Artifacts:** Generated sitemap or RSS (build step, plugin, or static files in [apps/front-app/public/](apps/front-app/public/) when present).
- **Checks:** When used: sitemap includes all public URLs; no broken or redirect-only URLs. lastmod when available. RSS: valid XML if present. Sitemap discoverable (robots.txt or documented).

### robots.txt, humans.txt, llms.txt

- **Artifacts:** Static files under [apps/front-app/public/](apps/front-app/public/) or server routes when added.
- **Checks:** robots.txt: User-agent and Allow/Disallow correct; Sitemap URL present when applicable. humans.txt / llms.txt: present and accurate if documented; no sensitive data.

### Core Web Vitals and layout stability

- **Artifacts:** [apps/front-app/index.html](apps/front-app/index.html) (fonts, preload if any), [apps/front-app/src/index.css](apps/front-app/src/index.css), image usage in [apps/front-app/src/](apps/front-app/src/).
- **Checks:** LCP: main content image or hero has fetchpriority and dimensions where applicable; font loading (swap/optional) to avoid FOIT. CLS: width/height or aspect-ratio on images. INP: no long tasks blocking interaction; forms and navigation responsive. Reason about or reference real metrics if available.

### Heading hierarchy and semantic HTML

- **Artifacts:** [apps/front-app/src/App.tsx](apps/front-app/src/App.tsx) and components under [apps/front-app/src/](apps/front-app/src/).
- **Checks:** One h1 per view; h2/h3 in order. Landmarks: main, nav, header, footer used where appropriate. Lists use ul/ol; buttons/links semantics correct. Images: alt text meaningful (decorative: alt="" or role="presentation" where appropriate).

### Bot experience and optional edge behavior

- **Artifacts:** Any Worker or edge logic (when added); optional llms.txt or alternate representations.
- **Checks:** If implemented: bot or UA handling does not block desired crawlers; alternate content is complete and consistent with site policy.

### Orphan pages and internal links

- **Artifacts:** Navigation and route tree; sitemap when present.
- **Checks:** No important URL unreachable from home or sitemap. Internal links use consistent paths. Client-only routes: ensure crawlers get a sensible default (e.g. SPA fallback) or prerender strategy if SEO-critical.

### Anti-patterns to flag

- Missing or duplicate title/meta description; generic og:image or wrong dimensions.
- JSON-LD with missing required fields or invalid structure.
- Sitemap missing new pages or including 404/redirect URLs.
- robots.txt disallowing important paths or missing Sitemap when used.
- Multiple h1s or broken heading hierarchy; images without alt.

## Steps

1. **Gather scope** — Full SEO or specific area (meta, structured data, feeds, CWV, headings). Default to full.
2. **Read conventions** — AGENTS.md for site structure and public routes.
3. **Inspect meta and OG** — index.html and per-route head; uniqueness and completeness.
4. **Inspect structured data** — JSON-LD when present; validity and required fields.
5. **Inspect sitemap and RSS** — Coverage when used; robots.txt and discovery.
6. **Inspect CWV and layout** — Fonts, images, dimensions; reason about LCP/INP/CLS.
7. **Inspect headings and semantics** — One h1, hierarchy, landmarks, alt text.
8. **Inspect optional bot/edge** — When implemented; consistency and crawlability.
9. **Compose plan** — Critical / Improvements / Optional; each item: **what**, **where**, **why**. One-line "no issues" per sub-area if none.

## Checklist

- [ ] Scope clear
- [ ] AGENTS.md consulted for routes and content
- [ ] Meta tags and Open Graph reviewed for the app shell and routes
- [ ] Structured data (JSON-LD) reviewed when present
- [ ] Sitemap and RSS reviewed when present; robots.txt and discovery checked
- [ ] Core Web Vitals and layout stability (fonts, images) considered
- [ ] Heading hierarchy and semantic HTML (including alt) reviewed
- [ ] Optional bot/edge and llms.txt reviewed when present
- [ ] Plan structured as Critical / Improvements / Optional with what/where/why

## Context usage

- Use `@file` for index.html, App.tsx, public assets, and any SEO config modules.
- Use `@code` for meta snippets or JSON-LD when suggesting changes.
- Use `@docs` or `@web` for Google structured data guidelines and CWV thresholds.

If context is insufficient, suggest which files or @ references to add.

## Review checklist

- **Correctness:** Meta and canonical match actual URLs; JSON-LD validates; sitemap URLs are valid when used.
- **Conventions:** Aligns with AGENTS.md (public routes, content structure).
- **Quality:** Crawlability and CWV support; no duplicate or misleading content.
- **Actionability:** Every suggestion is implementable (e.g. "add og:image to document head", "fix heading order in component X").
- **Trade-offs:** Note any (e.g. SPA vs prerender for SEO).
- **Scope:** SEO only; defer security or performance to their reviews.

## Output format

Respond with a **plan** only (no implementation unless the user asks):

1. **Critical** – Must-fix (missing canonical when needed, invalid JSON-LD, robots blocking key paths, broken heading hierarchy, missing alt on key images).
2. **Improvements** – Worthwhile (unique descriptions, better og:image, lastmod in sitemap, CWV tweaks).
3. **Optional** – Nice-to-haves (BreadcrumbList, humans.txt polish). Prefix with **Nit:** for non-blocking polish.

For each item: **what** to change, **where** (file/area), and **why**. If a sub-area has no findings, state it in one line.
