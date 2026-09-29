---
id: react
summary: React 19 patterns, effects, Suspense, compiler readiness
families: [frontend]
packages: [react, react-dom, @types/react, @types/react-dom, react-doctor]
paths: [apps/front-*/src/**, .claude/rules/frontend/react.md, .claude/rules/quality/lint-config.md]
---

# React

React 19 in `front-app`: rendering patterns, effects, data-flow boundaries, and DX on a TanStack Router/Query SPA.

## Ground truth

- **Collector**: "React" - React 19 APIs (`use`, actions, `ref` as prop, `forwardRef` changes), docs guidance on effects and fetching, React Compiler status.
- **Local skill**: `.agents/skills/vercel-react-best-practices/SKILL.md` for performance heuristics; `react-doctor` output when available.
- **Web fallback**: `react.dev` - reference pages and blog posts for the installed major.
- **Version currency**: catalog `react`, `react-dom`, `@types/react*` in [pnpm-workspace.yaml](../../../../pnpm-workspace.yaml); flag removed/deprecated APIs in code.

## Scope

- [apps/front-app/src/](../../../../apps/front-app/src/) - `pages/`, `routes/`, `hooks/`, `components/`, `services/`
- [apps/front-app/package.json](../../../../apps/front-app/package.json) (React deps, plugins); devtools wiring (`@tanstack/react-devtools`)
- Tests under `apps/front-app/tests/` (skill `front-vitest` for DOM harness conventions)

## Probe

Read representative routes, pages, hooks, and components end-to-end; run `pnpm react-doctor` once.

## Axes

- **React 19 adoption**: modern APIs where they replace boilerplate (no unnecessary `forwardRef`; `use` with Suspense where idiomatic).
- **Effects discipline**: effects only for synchronizing with external systems; no effect-derived state or event logic; cleanup correct.
- **Data flow**: server state in TanStack Query, URL state in search params, ephemeral UI state in components; no duplicated caches.
- **Rendering & performance**: memoization per current guidance (compiler-aware; targeted `memo`/`useMemo` only where proven); stable list keys.
- **Component hygiene**: structure/naming per nested AGENTS.md; error and Suspense boundaries at route level; accessibility basics (semantics, labels).
- **Version currency**: `@types/react` major matches runtime; devtools not leaking into production.
- **Agent loop**: feature-folder conventions documented so new components land consistently; fast per-app test loop.

## Critical when

Broken rendering; memory leaks; security-relevant issues (e.g. unsanitized HTML).

## Overlaps

Code splitting and chunk output belong to `vite`; query and router APIs belong to `tanstack-query` / `tanstack-router`; class usage belongs to `tailwind`.

## Accepted

- Conventions in [.claude/rules/frontend/react.md](../../../../.claude/rules/frontend/react.md) (layout, providers, splitting, React Doctor workflow); React Doctor and oxlint config rationale in [lint-config.md](../../../../.claude/rules/quality/lint-config.md).
