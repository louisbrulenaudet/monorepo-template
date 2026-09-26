# @repo/typescript-config

Shared TypeScript presets. Every app and library extends one and overrides only what it must (usually `types` and `include`), never forking compiler options. All of them inherit the strict core in `strict.json`, which is never extended directly.

| Preset | For |
|--------|-----|
| `workers.json` | Cloudflare Worker apps (a role alias of `library.json`) |
| `library.json` | Runtime-neutral libraries shared by browsers and Workers |
| `vite-react.json` | React + Vite SPAs |
| `vite-node.json` | The Node side of a Vite project (`vite.config.ts`) |
| `tests.json` | Mixin appended after a runtime preset in `tests/tsconfig.json` |

## Usage

A Worker gets its runtime types from the committed, `wrangler types`-generated `worker-configuration.d.ts` (regenerate with `pnpm types`):

```jsonc
// tsconfig.json
{
  "extends": "@repo/typescript-config/workers.json",
  "compilerOptions": { "types": ["./worker-configuration.d.ts"] },
  "include": ["worker-configuration.d.ts", "src/**/*.ts"]
}
```

Add `"node"` to `types` (and install `@types/node`) only when the Worker uses `nodejs_compat`. With service bindings, the Worker's `types` script passes every bound Worker's `wrangler.jsonc` so RPC stubs are typed on `Env` - see [`workers-config`](../../.claude/rules/backend/workers-config.md).

A React SPA splits browser source from the Vite config, and uses `package.json` `"imports"` rather than `paths` for in-app absolute imports:

```jsonc
// tsconfig.json
{ "extends": "./tsconfig.app.json" }

// tsconfig.app.json
{
  "extends": "@repo/typescript-config/vite-react.json",
  "include": ["src/**/*.ts", "src/**/*.tsx"],
  "compilerOptions": { "types": ["vite/client"] }
}

// tsconfig.node.json
{
  "extends": "@repo/typescript-config/vite-node.json",
  "include": ["vite.config.ts"]
}

// package.json
{
  "imports": {
    "#/*": ["./src/*", "./src/*.ts", "./src/*.tsx", "./src/*/index.ts", "./src/*/index.tsx"]
  }
}
```

A test project extends its package's base first, then the mixin:

```jsonc
// tests/tsconfig.json
{ "extends": ["../tsconfig.json", "@repo/typescript-config/tests.json"] }
```

Each package type-checks itself with `tsc --noEmit`, and `pnpm check-types` runs them all through Turborepo - there are no project references and no root solution `tsconfig.json`.

Agent and contributor detail: [AGENTS.md](AGENTS.md).
