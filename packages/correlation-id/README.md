# @repo/correlation-id

Opaque UUID v4 helpers that correlate SPA and gateway logs, shared so `worker-api` and `front-app` cannot drift on what counts as a safe id. The id travels as the `X-Request-Id` header and must never carry a client or matter identifier, so anything that is not an opaque UUID v4 is rejected. Runtime-neutral: Cloudflare Workers, browsers, and Node 19+.

## Usage

The gateway accepts a client-supplied opaque id or mints a new one:

```typescript
import { resolveCorrelationId } from "@repo/correlation-id";

const requestId = resolveCorrelationId(c.req.header("X-Request-Id"));
```

The SPA validates a stored id with the same predicate before reusing it; the `sessionStorage` persistence stays app-local in `apps/front-app/src/utils/correlation-id.ts`:

```typescript
import { isOpaqueCorrelationId } from "@repo/correlation-id";

if (existing && isOpaqueCorrelationId(existing)) {
  return existing;
}
```

Agent and contributor detail: [AGENTS.md](AGENTS.md).
