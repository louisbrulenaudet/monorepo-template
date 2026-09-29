---
paths:
  - "apps/*/vite.config.ts"
  - "apps/*/package.json"
---

# Local Dev Ports

| Role | Prefix | Local HTTP ports |
|------|--------|------------------|
| HTTP gateway | `worker-api` | 8700–8709 |
| Business worker (RPC) | `worker-*` | 8710–8739 |
| Queue-only consumer | `queue-*` | 8740–8759 |
| Webhook ingress | `webhook-*` | 8760–8779 |
| MCP server | `mcp-*` | 8780–8789 |
| Growth reserve | - | 8790–8799 |
| Frontend (Vite) | `front-*` | 5170–5199 (dev), 4170–4199 (preview) |

Assigned: `worker-api` 8700; `front-app` 5174 dev, 4174 preview.

- A new app takes the **next free port** in its role's range and records it in `package.json` → `monorepo.devPort` and in `vite.config.ts` (`server.port` with `strictPort: true`; a frontend also sets `preview.port` with `strictPort: true`). `cf dev` runs the Vite dev server and forwards only `--mode`, so the port lives in `vite.config.ts` alone.
- RPC and queue workers still set a stable `server.port` for a standalone `cf dev`, though production gives them no public URL. How several Workers run together locally under cf is settled with the first `worker-*`.
- A Worker with code sets `cloudflare({ inspectorPort: 0 })` (ephemeral), so parallel dev servers never collide on an inspector port.
