---
id: tanstack-devtools
summary: TanStack Devtools shell, its Query and Router panels, dev-only mounting
families: [frontend, tanstack]
packages: [@tanstack/react-devtools]
paths: [apps/front-*/src/components/devtools/**, apps/front-*/src/routes/__root.tsx]
---

# TanStack Devtools

The `TanStackDevtools` shell that hosts the React Query and Router panels in the SPA during development.

## Ground truth

- **Stale-knowledge risk**: pre-1.0 (`0.x`); the shell `config`, the plugin shape, and the panel exports change between minors.
- **Collector**: "TanStack Devtools" at the installed version - `TanStackDevtools` props (`config`, `plugins`), plugin `id`/`name`/`render`, panel components (`ReactQueryDevtoolsPanel`, `TanStackRouterDevtoolsPanel`), production behavior.
- **Local skill**: the `devtools-production` skill shipped inside the installed `@tanstack/devtools`; official docs beat it.
- **Web fallback**: `tanstack.com/devtools` - docs, `github.com/TanStack/devtools` releases.
- **Version currency**: catalog `@tanstack/react-devtools` in [pnpm-workspace.yaml](../../../../pnpm-workspace.yaml); check that the Query and Router panel packages it hosts are on versions it supports.

## Scope

- [AppDevtools.tsx](../../../../apps/front-app/src/components/devtools/AppDevtools.tsx) - the shell, its `config`, and both panels
- [__root.tsx](../../../../apps/front-app/src/routes/__root.tsx) - the `import.meta.env.DEV` lazy mount
- The `@tanstack/react-devtools!` production ignore in [knip.jsonc](../../../../knip.jsonc)
- The DevTools section of [.claude/rules/frontend/vite-config.md](../../../../.claude/rules/frontend/vite-config.md) for the plugin options the shell depends on

## Probe

Read the scope only.

## Axes

- **Production exclusion**: the shell and every panel load only behind `import.meta.env.DEV`, so the production bundle carries none of them.
- **Shell API**: `config` keys and the plugin entries are valid at the installed version; no deprecated panel export in use.
- **Panel coverage**: every TanStack library the SPA uses that ships a devtools panel is mounted as a plugin, and none is mounted twice (no standalone `ReactQueryDevtools` beside the shell).
- **Version currency**: new shell options or panels worth adopting; a renamed prop or plugin field.
- **Agent loop**: the shell adds no console error and no overlay that would fail the browser check of skill `run-app`.

## Critical when

A devtools package reaches the production bundle, or the shell API in use is removed at the installed version.

## Overlaps

The `@tanstack/devtools-vite` plugin and its options (event bus, console piping, source injection) belong to `vite`; panel internals belong to `tanstack-query` and `tanstack-router`.

## Accepted

- Devtools mount dev-only through a lazy import, never a production flag ([react.md](../../../../.claude/rules/frontend/react.md)).
