@AGENTS.md

## Claude Code

- Factory changes are monorepo-wide - run filtered Vitest for `front-app` and `worker-api` before merging.
- Node apps import `@repo/vitest-config`; Workers apps import `@repo/vitest-config/workers`.
