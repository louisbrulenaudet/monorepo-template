---
paths:
  - ".worktreeinclude"
  - ".claude/settings.json"
---

# Worktrees

- `worktree.symlinkDirectories` cannot replace the per-worktree `pnpm install` (root `AGENTS.md`): pnpm keeps a `node_modules` at the root and in every workspace package, and a symlinked root one would make a worktree install write into the main checkout. The install hardlinks from the store, so it costs CPU once, not disk.
- `worktree.sparsePaths` is applied as a **cone-mode** sparse checkout: every root-level file is checked out whether listed or not; only directories are filtered. The directory entries do the work (`.agents`, `.changeset`, `.claude`, `.cspell`, `.cursor`, `.github`, `.playwright`, `.vite-hooks`, `.vscode`, `apps`, `hooks`, `packages`); the root-file entries stay so the list is still correct if the checkout stops being cone-mode. Add any new root directory the tooling needs; `.opencode` is excluded on purpose.
- `.worktreeinclude` copies matching gitignored files into each new worktree. It has no patterns today, so a worktree starts with cold Turbo and Node compile caches. Never add env or credential files - provision isolated credentials per worktree ([guardrails.md](guardrails.md)). A `WorktreeCreate` hook would disable `.worktreeinclude` entirely, which is why there is none.
