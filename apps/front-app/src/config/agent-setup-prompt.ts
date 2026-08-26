export const AGENT_SETUP_PROMPT = `You are setting up a pnpm + Turborepo monorepo built on Cloudflare Workers.

Stack:
- Apps live in apps/ (worker-api HTTP gateway, front-app React SPA, plus worker-*, queue-*, webhook-*, mcp-* prefixes).
- Shared packages live in packages/ (@repo/enums-common, @repo/dtos-common, @repo/correlation-id, @repo/vitest-config, ...).
- Frontend: React 19 + Vite + Tailwind CSS v4 + TanStack Router/Query. It talks to worker-api over HTTP only.
- Worker-to-Worker communication uses service-binding RPC, never HTTP or package imports.
- Third-party dependency versions are centralized in the pnpm catalog (pnpm-workspace.yaml) and referenced as "catalog:".
- Lint with OXC from the repo root; type-check and test through Turbo (pnpm run ci is the full local PR gate).

Your task: read AGENTS.md at the repository root and in each app/package before making changes, then follow the conventions described there.`;
