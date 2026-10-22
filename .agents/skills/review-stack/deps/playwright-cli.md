---
id: playwright-cli
summary: browser checks for agents, .playwright/cli.config.json, sandbox exclusion
families: [agents]
packages: [@playwright/cli]
paths: [.playwright/**, .agents/skills/run-app/SKILL.md, .claude/skills/playwright-cli]
---

# Playwright CLI

`playwright-cli`, the headless browser that agents drive to render the SPA, read its console and network, and evaluate router and query state during skill `run-app`.

## Ground truth

- **Stale-knowledge risk**: pre-1.0 (`0.x`); commands, flags, and config keys change between minors.
- **Collector**: "Playwright CLI" (`microsoft/playwright-cli`) at the installed version - command list, `cli.config.json` schema, session and daemon model, output formats (`--raw`, `--json`).
- **Local skill**: `.agents/skills/pnpm-@playwright+cli-playwright-cli/SKILL.md`, linked by `pnpm install` from the installed `@playwright/cli` (`permissions` `skills` grant); official docs beat it.
- **Web fallback**: `github.com/microsoft/playwright-cli` - README, releases; `playwright.dev` for the browser launch options the config passes through.
- **Version currency**: catalog `@playwright/cli` in [pnpm-workspace.yaml](../../../../pnpm-workspace.yaml) vs latest; the skill follows the installed version.

## Scope

- [.playwright/cli.config.json](../../../../.playwright/cli.config.json) - browser, `isolated`, `launchOptions`
- Root `@playwright/cli` devDependency and the `browser` script in [package.json](../../../../package.json)
- The browser-check step of [skill run-app](../../run-app/SKILL.md) and every `pnpm exec playwright-cli` command it documents
- `.claude/settings.json`: the `Bash(pnpm exec playwright-cli *)` allow and the `sandbox.excludedCommands` entry; `.gitignore` and `.vscode/settings.json` entries for `.playwright-cli/`

## Probe

Read the scope; run `pnpm exec playwright-cli --help` once. Never open a browser: that needs running dev servers, and this review never starts them.

## Axes

- **Command contract**: every command and flag that skill `run-app` documents (`open`, `snapshot`, `console`, `requests`, `eval`, `route`, `unroute`, `reload`, `close`, `install-browser`, `--raw`, `--json`) exists at the installed version with the same meaning.
- **Config**: `cli.config.json` keys are valid at the installed version; headless and isolated sessions stay on, so no profile state leaks between runs.
- **Sandbox fit**: the `excludedCommands` pattern still matches how the binary is invoked; artifact and cache directories are gitignored.
- **Version currency**: new commands or output modes that would replace an `eval` snippet or a manual step in `run-app`; the vendored skill matches the installed CLI.
- **Agent loop**: a rendered-SPA check stays a short, copyable command sequence whose output an agent can parse.

## Critical when

A command or flag `run-app` documents is removed or renamed, so the browser check fails or silently checks nothing.

## Overlaps

The dev servers, ports, and smoke script belong to skill `run-app` and rule `backend/ports`; sandbox and permission policy as a whole belongs to `claude-code`; router and query state shapes belong to `tanstack-router` and `tanstack-query`.

## Accepted

- The CLI runs outside the sandbox through `sandbox.excludedCommands`: Chrome cannot start inside it (skill `run-app`).
- It is a root devDependency, never an app one: only agents and humans call it.
