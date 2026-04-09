# Review code quality command

Run a **code-quality-focused** review: naming conventions, TypeScript strictness, Biome compliance, duplication, readability, error handling patterns, testability, and type safety. Your reply must be a **plan of suggested changes**: concise, actionable, and structured—not only prose.

## Cursor command usage

This file is a [Cursor custom command](https://docs.cursor.com/context/commands): plain Markdown in `.cursor/commands/`. When the user runs `/review-code-quality` in chat, this content is sent as the prompt.

- **Parameters:** Any text after `/review-code-quality` is scope—e.g. `/review-code-quality worker-api only`, `/review-code-quality naming`—narrow accordingly. If none given, assume full code quality review (both apps and shared packages).

This command is project-scoped and works with @ mentions and Rules. For a full review use `/review` instead.

## Best practices alignment

- **Naming** — Per root [AGENTS.md](AGENTS.md): variables and functions `camelCase`; constants `CONSTANT_CASE`; enum names `PascalCase`, enum members `CONSTANT_CASE`. No single-letter names except trivial loop indices; descriptive names for exports and public APIs.
- **TypeScript** — Strict mode; no `any` or unsafe `as` without justification; no `@ts-ignore` without comment. Explicit return types on exported functions; inferred where trivial. Zod schemas co-located with inferred types where used.
- **Biome** — Format and lint applied; no disabled rules that hide real issues; consistent style (spaces, double quotes, line width).
- **Structure** — Single responsibility per file/function; files under ~300 lines, functions under ~50 lines where practical; clear separation (DTOs in `@repo/dtos-common`, routes, handlers, utils).
- **Errors** — Hono `HTTPException` and centralized `onError` where used; avoid leaking internals; safe logging (no sensitive data).
- **Duplication and dead code** — No copy-paste blocks that should be shared; no dead imports or unreachable code; no string literals where enums or constants exist.

Align with root and app AGENTS.md for conventions and patterns.

## Deep technical review

Conduct a code-quality-only review. Inspect the following and call out violations or improvements.

### Naming conventions

- **Artifacts:** All [apps/front-app/src/](apps/front-app/src/) and [apps/worker-api/src/](apps/worker-api/src/) (variables, functions, constants, enums), [packages/dtos-common/src/](packages/dtos-common/src/), [packages/enums-common/src/](packages/enums-common/src/).
- **Checks:** Variables: camelCase (e.g. `blogPostList`, `postId`). Functions: camelCase (e.g. `getPost()`, `validateEmail()`). Constants: CONSTANT_CASE (e.g. `MAX_RETRIES`, `DEFAULT_TIMEOUT`). Enum names: PascalCase (e.g. `BlogTag`, `ContentEncoding`). Enum members: CONSTANT_CASE (e.g. `BlogTag.TECHNOLOGY`). No `blogTag` for enum name or `technology` for member. File names: PascalCase for components/classes where project uses it; kebab or consistent pattern for utils/config. Exported types: PascalCase.

### TypeScript strictness and type safety

- **Artifacts:** All `.ts` and `.tsx` files in apps and packages; [tsconfig.json](tsconfig.json) and app tsconfigs.
- **Checks:** No `any` unless justified (e.g. third-party type gap) and commented. No `as` casts that hide bugs (prefer type guards or schema parsing). No `@ts-ignore` without a short comment and ticket if applicable. Exported functions have explicit return types. Optional chaining and nullish coalescing used instead of loose checks where appropriate. Zod inference: use `z.infer<typeof schema>` for types; no duplicate hand-written types that can drift. Generic constraints where generics are used.

### Biome and format

- **Artifacts:** [biome.json](biome.json), all source files (format and lint).
- **Checks:** Code is formatted with Biome (spaces, double quotes, line width 80 per config). Lint: no biome-ignore that disables a rule without a one-line justification. Consistent use of optional chaining, template literals, and const where applicable. No unused variables or imports (Biome or manual check). No debug code (e.g. `console.log`) left in production paths.

### Duplication and DRY

- **Artifacts:** [apps/worker-api/src/](apps/worker-api/src/) (routes, handlers, utils), [apps/front-app/src/](apps/front-app/src/) (utils, components).
- **Checks:** Repeated logic (e.g. date formatting, URL building, error mapping) extracted to shared util or constant. No copy-paste blocks across files without extraction. Shared Zod schemas and types in `@repo/dtos-common`; enums in `@repo/enums-common`. Constants (URLs, limits) defined once and imported.

### Error handling patterns

- **Artifacts:** [apps/worker-api/src/index.ts](apps/worker-api/src/index.ts) (`onError`), route handlers under [apps/worker-api/src/routes/](apps/worker-api/src/routes/), async UI in [apps/front-app/src/](apps/front-app/src/).
- **Checks:** Use `HTTPException` or structured responses consistently. No raw `throw new Error("...")` without handling at the boundary. Catch blocks: handle or rewrap; don’t swallow without logging. Async: use try/catch with await or .catch() consistently. Logging: no sensitive data in log messages.

### Readability and structure

- **Artifacts:** All source files in scope.
- **Checks:** Files under ~300 lines; consider splitting large files. Functions under ~50 lines; complex logic in smaller named functions. Single responsibility: one main export or one concern per file where possible. Imports: grouped (external, then internal); no circular imports. Barrel exports (index.ts): re-export only what’s part of the public API; avoid deep re-exports that obscure dependency graph.

### Testability

- **Artifacts:** Services, utils, and pure functions; route handlers that orchestrate services.
- **Checks:** Pure logic in testable functions (no hidden globals or side effects). Dependencies injectable or passed in (no hard-coded fetch or env inside pure logic where it hurts tests). Route handlers thin (parse → validate → call service → respond); business logic in services. No untestable side effects in module scope.

### Dead code and string literals

- **Artifacts:** All source and config files in scope.
- **Checks:** No unused exports, variables, or imports. No unreachable code after return/throw. No commented-out blocks that should be removed or restored. String literals for known finite sets (e.g. tag names, error codes) replaced by enums or constants from a single source of truth.

### Anti-patterns to flag

- Enum named in camelCase or member in camelCase (per AGENTS.md).
- `any` or broad `as` without justification; @ts-ignore without comment.
- console.log or debugger in production code paths.
- Large files or functions that could be split; duplicated logic across files.
- Throwing unhandled generic errors at API boundaries; swallowing errors.
- Unused imports or variables; string literals that duplicate enum/constant values.
- Barrel files that re-export internals and blur public API.

## Steps

1. **Gather scope** — Full codebase or specific app/area (e.g. worker-api, front-app). Default to both apps and packages.
2. **Read conventions** — Root and app AGENTS.md for naming, structure, and error handling.
3. **Inspect naming** — Variables, functions, constants, enums across key files; flag convention violations.
4. **Inspect TypeScript** — any, as, @ts-ignore, return types, Zod usage; flag strictness issues.
5. **Inspect Biome and format** — Lint/format consistency; unused code; console/debugger.
6. **Inspect duplication and structure** — Repeated logic; file/function size; separation of concerns.
7. **Inspect error handling** — Hono error handling; catch/rethrow; logging.
8. **Inspect dead code and literals** — Unused exports/imports; string literals vs enums/constants.
9. **Compose plan** — Critical / Improvements / Optional; each item: **what**, **where**, **why**. One-line "no issues" per sub-area if none.

## Checklist

- [ ] Scope clear
- [ ] Root and app AGENTS.md consulted for naming and patterns
- [ ] Naming conventions (camelCase, CONSTANT_CASE, PascalCase enums) reviewed
- [ ] TypeScript strictness and type safety reviewed
- [ ] Biome/format and lint (including no dead code) reviewed
- [ ] Duplication and structure (file/function size, DRY) reviewed
- [ ] Error handling patterns (Hono, logging) reviewed
- [ ] Testability and dead code/string literals reviewed
- [ ] Plan structured as Critical / Improvements / Optional with what/where/why

## Context usage

- Use `@file` for key modules (dtos-common, routes, utils); use `@code` for specific violations.
- Use `@git` when reviewing recent changes for quality regression.
- Use AGENTS.md as authority for naming and structure.

If context is insufficient, suggest which files or @ references to add.

## Review checklist

- **Correctness:** Naming and types are consistent with AGENTS.md; no logic errors introduced by suggestions.
- **Conventions:** Matches project standards (Biome, TypeScript strict, shared DTOs).
- **Quality:** Readability and maintainability improved; testability preserved or improved.
- **Actionability:** Every suggestion is implementable (e.g. "rename X to Y", "extract Z to util").
- **Trade-offs:** Note any (e.g. file split vs navigation; explicit return types vs brevity).
- **Scope:** Code quality only; defer performance or security to their reviews.

## Output format

Respond with a **plan** only (no implementation unless the user asks):

1. **Critical** – Must-fix (naming violations in public API, any without justification, swallowed errors, dead code that affects behavior).
2. **Improvements** – Worthwhile (extract duplication, explicit return types, consistent HTTP errors, enum for literals).
3. **Optional** – Nice-to-haves (shorter functions, barrel cleanup). Prefix with **Nit:** for non-blocking polish.

For each item: **what** to change, **where** (file/area), and **why**. If a sub-area has no findings, state it in one line.
