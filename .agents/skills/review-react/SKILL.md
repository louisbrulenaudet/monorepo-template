---
name: review-react
description: "React 19 review (front-app patterns, compiler readiness, Suspense boundaries, hooks discipline) against current official React best practices. USE WHEN: user runs /review-react or explicitly asks for this review. DO NOT USE WHEN: reviewing app code, other dev dependencies, or implementing features."
disable-model-invocation: true
context: fork
background: true
model: sonnet
effort: medium
---

# Review React

Review the React 19 usage in `front-app` for alignment with current official React best practices - rendering patterns, data-fetching composition, and developer experience on a TanStack Router/Query SPA deployed via Cloudflare. Your reply must be a **plan of suggested changes**: concise, actionable, structured - not only prose.

## Invocation

Text after the slash command is additional scope/focus (e.g. "hooks", "Suspense") - narrow the review accordingly.

## Ground truth (mandatory)

Your pre-trained knowledge of React may be outdated. **Do not draft suggestions from memory alone.**

1. Resolve "React" via the **Context7 MCP** (`resolve-library-id` → `query-docs`): React 19 APIs (`use`, actions, `ref` as prop, forwardRef changes), docs guidance on effects and fetching.
2. Cross-check with the local skill `.agents/skills/vercel-react-best-practices/SKILL.md` for performance heuristics used by this repo.
3. For anything Context7 lacks, use **Firecrawl search/scrape restricted to the official domain** (`react.dev`) - reference pages and blog posts for the installed major.
4. Version currency: catalog `react`/`react-dom`/`@types/react*` in [pnpm-workspace.yaml](../../../pnpm-workspace.yaml) vs latest stable; flag removed/deprecated APIs still present in code.
5. Cite the retrieved source next to every finding; label anything unverifiable as **Unverified**.

## Scope artifacts

- [apps/front-app/src/](../../../apps/front-app/src/) - `pages/`, `routes/`, `hooks/`, `components/`, `services/`
- [apps/front-app/package.json](../../../apps/front-app/package.json) (React deps, plugins); devtools wiring (`@tanstack/react-devtools`)
- Tests under `apps/front-app/tests/` (see `front-vitest` skill for DOM harness conventions)

## Analysis axes

- **React 19 adoption**: modern APIs used where they replace boilerplate (no unnecessary `forwardRef`; `use` with promises/Suspense where idiomatic); no legacy patterns kept out of habit.
- **Effects discipline**: effects only for synchronization with external systems; no effect-based derived state or event logic; cleanup correctness.
- **Data flow**: server state in TanStack Query, URL state in router search params, ephemeral UI state in components - boundaries respected; no duplicated caches.
- **Rendering & performance**: memoization applied per current guidance (compiler-aware defaults, targeted `memo`/`useMemo` where proven needed); list keys stable; lazy/route-level code splitting aligned with `/review-vite` findings.
- **Component hygiene**: consistent component structure/naming per nested AGENTS.md; error and Suspense boundaries at route level; accessibility basics (semantics, labels).
- **Version currency**: types aligned (`@types/react` major matches runtime); devtools not leaking into production builds.

## DX & AI-agentic workflow

Verify agent-friendliness: feature folder conventions documented in nested AGENTS.md so new components land consistently; fast per-app test loop exists for verification after edits.

## Steps

1. Collect ground truth before reading code.
2. Read representative routes/pages/hooks/components end-to-end.
3. Walk each analysis axis; note findings or explicit one-line "no issues".
4. Compose the plan grouped Critical / Improvements / Optional with **what**, **where**, **why**, and source citations.

## Output format

1. **Critical** - broken rendering, memory leaks, security-relevant issues (e.g. unsanitized HTML).
2. **Improvements** - pattern modernization and perf wins.
3. **Optional** - nice-to-haves; prefix pure polish with **Nit:**.

Read-only review: produce the plan only; implement nothing unless explicitly asked afterwards.
