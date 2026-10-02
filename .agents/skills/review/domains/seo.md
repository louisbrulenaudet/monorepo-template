---
id: seo
summary: indexability of the client-rendered SPA - per-route head, canonical, soft 404s, robots and sitemap, structured data, Preview leakage
model: sonnet
applies_when: "a front-* app opts into indexing: a route under src/routes sets head(), or public/ ships robots.txt or a sitemap"
---

# SEO

Can a crawler discover, render, and correctly index the public pages of a client-rendered SPA served from Workers static assets - and nothing that should stay private?

`front-*` apps are SPAs with no SSR by design (rule `frontend/react`): treat that as an accepted trade-off, and review what a client-rendered app can still get right.

## Ground truth

- Rules: [frontend/react](../../../../.claude/rules/frontend/react.md), [frontend/tanstack-router](../../../../.claude/rules/frontend/tanstack-router.md), [frontend/vite-config](../../../../.claude/rules/frontend/vite-config.md) (`_headers`), [ops/previews](../../../../.claude/rules/ops/previews.md).
- Skill `tanstack-router` (`head()`, `<HeadContent />`, not-found routes).
- External, retrieved before citing: [JavaScript SEO basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics), [robots.txt](https://developers.google.com/search/docs/crawling-indexing/robots/intro), [structured data](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data), [SPA routing on Workers static assets](https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/).

## Scope

`apps/front-*/index.html`, `apps/front-*/src/routes/**` (`__root.tsx` head, per-route `head()`, not-found component), `apps/front-*/src/pages/**`, `apps/front-*/public/**`, `apps/front-*/cloudflare.config.ts` (`assets.notFoundHandling`), `apps/front-*/vite.config.ts` (generated `_headers`). A route path focus narrows to that route.

## Probe

`git log --follow --format='%h %s' -- <file>`. When dev servers are **already** running (never start them): the SPA-route probes of `node .github/actions/lib/smoke.mjs`, or `pnpm exec playwright-cli snapshot <url>` to see the rendered head.

## Axes

- **Per-route head**: each indexable route sets a unique `<title>`, meta description, and `<link rel="canonical">` through TanStack Router `head()` rendered by `<HeadContent />` (or React 19 native `<title>` / `<meta>` hoisting), not one static shell title for every route; Open Graph / Twitter tags with an absolute `og:url` and `og:image` when sharing matters.
- **Soft 404s**: `notFoundHandling: "single-page-application"` answers 200 with `index.html` for every unknown path, so the router's not-found route sets `<meta name="robots" content="noindex">`; unknown API paths opened in a browser return HTML, so API URLs are never linked or listed.
- **Crawlability**: navigation uses real `<a href>` (`<Link>`), never click handlers alone; content needed for indexing does not require interaction; `robots.txt` and the sitemap are real files in `public/`, not served by the SPA fallback, and `robots.txt` never disallows JS or CSS; the sitemap lists only canonical, 200 URLs.
- **Structured data**: JSON-LD in `application/ld+json`, valid, no empty required properties, no duplicate `@id`, matching visible content.
- **Previews and non-production**: Preview and staging URLs are never canonical, never in a sitemap, and send `noindex` (header or meta); a production canonical never points at a `workers.dev` host once a custom domain exists.
- **i18n** (only if localized routes exist): reciprocal `hreflang` with `x-default`, one URL per locale.

## Critical when

Every route sharing one title and canonical on a site meant to rank; the not-found route indexable as 200 content; `robots.txt` blocking the app or its assets; Previews or staging indexable or listed; invalid JSON-LD on a page that relies on rich results.

## Overlaps

Core Web Vitals, images, and CLS belong to `performance`; headings, landmarks, and alt text to `ui`; CSP and security headers to `security`; Router API currency to `review-stack tanstack-router`.

## Accepted

- No SSR or prerendering: rule [frontend/react](../../../../.claude/rules/frontend/react.md).
