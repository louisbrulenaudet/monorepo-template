# Review architecture command

Run an **architecture-focused** review of the monorepo: layout, workspace dependencies, Turborepo task graph, app vs package boundaries, dependency direction, and module coupling/cohesion. Your reply must be a **plan of suggested changes**: concise, actionable, and structured—not only prose.

## Cursor command usage

This file is a [Cursor custom command](https://docs.cursor.com/context/commands): plain Markdown in `.cursor/commands/`. When the user runs `/review-architecture` in chat, this content is sent as the prompt.

- **Parameters:** Any text after `/review-architecture` is additional scope—e.g. `/review-architecture only packages`, `/review-architecture front-app worker-api boundary`—narrow the review accordingly. If none given, assume full monorepo architecture.

This command is project-scoped and works with @ mentions and Rules. For a full multi-dimension review, use `/review` instead.

## Best practices alignment

- **Dependency direction** — Apps depend on packages; packages must not depend on apps. No circular dependencies between workspaces.
- **Single responsibility** — Each package has one clear purpose (e.g. `@repo/dtos-common`, `@repo/enums-common`, `@repo/typescript-config`).
- **Public API surface** — Packages expose a minimal, stable API via barrel exports; internal modules are not re-exported unless intentional.
- **Turborepo** — Task graph is acyclic; cache boundaries and `dependsOn` are correct; no redundant or missing tasks.
- **Makefile** — Single entry point for common operations; app-specific Makefiles delegate to root or extend cleanly; port allocation is documented and consistent.

Align with root [AGENTS.md](AGENTS.md) and app-level AGENTS.md for stated architecture and naming.

## Deep technical review

Conduct an architecture-only review. Inspect the following and call out violations or improvements.

### Monorepo layout and boundaries

- **Artifacts:** [pnpm-workspace.yaml](pnpm-workspace.yaml), root [package.json](package.json), [apps/](apps/) and [packages/](packages/) directory structure.
- **Checks:** Workspace globs (`apps/*`, `packages/*`) match actual layout. No app code under `packages/` and no shared library code under `apps/` except app-specific utilities. Clear naming: `front-app` (React + Vite frontend), `worker-api` (API worker), `dtos-common` / `enums-common` (shared contracts), `typescript-config` (TS configs only). Optional: `worker-frontend` as a second Vite app if present.

### Workspace dependencies and dependency direction

- **Artifacts:** Each app and package [package.json](package.json) (dependencies and devDependencies), imports of `@repo/*` across the repo.
- **Checks:** Apps list `@repo/dtos-common`, `@repo/enums-common`, and/or `@repo/typescript-config` with workspace protocol (`workspace:*` or `workspace:^`) where appropriate. Packages do **not** depend on apps or on each other unless documented (e.g. typescript-config may be dev-only). Run (or reason about) `pnpm why <package>` to detect unnecessary or circular dependencies. No circular workspace dependencies.

### Turborepo task graph and caching

- **Artifacts:** [turbo.json](turbo.json), root and app [package.json](package.json) scripts.
- **Checks:** Tasks `lint`, `format`, `check`, `check-types`, `types`, `build`, `dev`, `preview`, `deploy` are defined; `build` has correct `dependsOn` (e.g. no missing dependency on type generation if applicable). Global dependency files (e.g. `biome.json`, `tsconfig.json`, `pnpm-workspace.yaml`) are listed where they affect cache validity. No task cycles. Caching is beneficial (e.g. `build` cacheable, `dev` not cacheable).

### Makefile and port allocation

- **Artifacts:** Root [Makefile](Makefile), [make/](make/) includes (e.g. [make/variables.mk](make/variables.mk), [make/dev.mk](make/dev.mk)), app Makefiles under [apps/front-app/Makefile](apps/front-app/Makefile), [apps/worker-api/Makefile](apps/worker-api/Makefile).
- **Checks:** Root `make install`, `make dev`, `make check`, `make check-types`, `make deploy` behave as documented in AGENTS.md. Port allocation is consistent (e.g. 5174 for front-app, 8725 for worker-api) and documented. No duplicated logic that should live in root makefiles.

### Package public API and barrel exports

- **Artifacts:** [packages/dtos-common/src/](packages/dtos-common/src/) (barrel and subpaths), [packages/dtos-common/package.json](packages/dtos-common/package.json), [packages/enums-common/src/index.ts](packages/enums-common/src/index.ts), [packages/enums-common/package.json](packages/enums-common/package.json), [packages/typescript-config/](packages/typescript-config/) (exports in package.json if any).
- **Checks:** `@repo/dtos-common` and `@repo/enums-common` expose only what consumers need; no leaking of internal paths. `@repo/typescript-config` exposes config files only; no runtime code. Package `main`/`exports` point to stable entry points. No deep imports that bypass declared exports unless intentional and documented.

### App-level structure

- **Artifacts:** Root [AGENTS.md](AGENTS.md), [apps/worker-api/AGENTS.md](apps/worker-api/AGENTS.md), [apps/worker-api/src/](apps/worker-api/src/) (routes, handlers), [apps/front-app/src/](apps/front-app/src/) (React components, utils, enums).
- **Checks:** worker-api: clear separation routes → handlers/services; validation with shared Zod DTOs from `@repo/dtos-common`; no business logic in route handlers beyond orchestration. front-app: UI and client-only logic in React; API calls over HTTP to `worker-api`. Alignment with AGENTS.md application structure.

### Anti-patterns to flag

- Packages depending on apps or on each other in a cycle.
- Turborepo tasks that can run in parallel but are serialized unnecessarily, or cache keys that ignore critical inputs.
- Makefile targets that duplicate root behavior or use inconsistent env (e.g. different Node version).
- Barrel exports that re-export everything (e.g. wildcard re-exports from internals), making the public API unclear.
- Apps importing from package paths that are not part of the package’s declared exports (brittle, may break on publish).

## Steps

1. **Gather scope** — Full monorepo or specific area (e.g. only packages, only Turborepo). If scope is unclear, default to full architecture.
2. **Read conventions** — Root [AGENTS.md](AGENTS.md) and app AGENTS.md for stated architecture, workspace layout, and port allocation.
3. **Inspect workspace and dependencies** — Open pnpm-workspace.yaml, root and app/package package.json files; trace `@repo/*` and cross-workspace dependencies; reason about or run cycle detection.
4. **Inspect Turborepo** — Open turbo.json and script definitions; verify task graph and cache configuration.
5. **Inspect Makefile** — Root Makefile and make/*.mk; app Makefiles; verify targets and port usage.
6. **Inspect package APIs** — packages/dtos-common, packages/enums-common, and packages/typescript-config entry points and exports; ensure minimal, stable public API.
7. **Review app structure** — worker-api layers (routes, handlers); front-app React tree and boundaries with worker-api; alignment with AGENTS.md.
8. **Compose plan** — Critical / Improvements / Optional; each item: **what**, **where**, **why**. If a sub-area has no findings, say so in one line.

## Checklist

- [ ] Scope clear (full monorepo or specified area)
- [ ] Root and app AGENTS.md consulted for architecture
- [ ] pnpm-workspace.yaml and all package.json dependency lists reviewed
- [ ] Circular or reverse dependency direction checked
- [ ] turbo.json task graph and cache deps reviewed
- [ ] Makefile and make includes reviewed; ports consistent
- [ ] Package public APIs (dtos-common, enums-common, typescript-config) reviewed
- [ ] worker-api and front-app internal structure reviewed
- [ ] Plan structured as Critical / Improvements / Optional with what/where/why

## Context usage

- Use `@file` for package.json, turbo.json, Makefile, and AGENTS.md when reviewing structure.
- Use `@code` for specific dependency or export snippets when suggesting changes.
- Use `@git` when reviewing recent architectural changes in commits or PRs.

If context is insufficient, suggest which files or @ references to add.

## Review checklist

- **Correctness:** Dependency direction and task graph are logically correct; no cycles.
- **Conventions:** Matches AGENTS.md layout and naming (apps vs packages, port allocation).
- **Quality:** Clear boundaries, minimal and stable package APIs, reproducible builds via Makefile/turbo.
- **Actionability:** Every suggestion is implementable (e.g. "move X to package Y", "add task Z to turbo.json").
- **Trade-offs:** If a suggestion has trade-offs (e.g. splitting a package), state them briefly.
- **Scope:** Limit to architecture; call out config, security, or performance as separate follow-ups if needed.

## Output format

Respond with a **plan** only (no implementation unless the user asks):

1. **Critical** – Architecture violations (circular deps, wrong dependency direction, broken task graph).
2. **Improvements** – Worthwhile changes (clearer boundaries, better task deps, cleaner package API).
3. **Optional** – Nice-to-haves (docs, minor renames). Prefix with **Nit:** for non-blocking polish.

For each item: **what** to change, **where** (file/area), and **why**. Keep items short and scannable. If a sub-area has no findings, state it in one line (e.g. "Turborepo task graph: no issues identified").
