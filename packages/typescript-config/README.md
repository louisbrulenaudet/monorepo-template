# @repo/typescript-config

Shared TypeScript presets. Every app and library extends one and overrides only what it must (usually `types` and `include`), never forking compiler options. All of them inherit the strict core in `strict.json`, which is never extended directly.

| Preset            | For                                                            |
| ----------------- | -------------------------------------------------------------- |
| `workers.json`    | Cloudflare Worker apps (a role alias of `library.json`)        |
| `library.json`    | Runtime-neutral libraries shared by browsers and Workers       |
| `vite-react.json` | React + Vite SPAs                                              |
| `vite-node.json`  | The Node side of a Vite project (`vite.config.ts`)             |
| `tests.json`      | Mixin appended after a runtime preset in `tests/tsconfig.json` |

## Usage

A Worker gets `Env` and its runtime types from `.cloudflare/types/index.d.ts`, which `pnpm types` (`cf workers types`) generates from its `cloudflare.config.ts`. The file is gitignored; `check-types` runs `types` first through Turborepo:

```jsonc
// tsconfig.json
{
  "extends": "@repo/typescript-config/workers.json",
  "compilerOptions": { "types": [] },
  "include": ["src/**/*.ts", "cloudflare.config.ts", ".cloudflare/types"],
}
```

`allowImportingTsExtensions` (set by the presets) covers the `./src/index.ts` entrypoint import in `cloudflare.config.ts`. Add `"node"` to `types` (and install `@types/node`) only when Worker source imports Node built-ins. The Worker's `vite.config.ts` type-checks in its own `tsconfig.node.json` on `vite-node.json`, as in the SPA below. Service bindings and cross-Worker RPC typing: [`workers-config`](../../.claude/rules/backend/workers-config.md).

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
