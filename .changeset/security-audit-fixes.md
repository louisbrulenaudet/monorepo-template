---
"worker-api": patch
"front-app": patch
---

Security-audit hardening. `worker-api` samples Sentry traces with a boolean decision, so a caller-supplied `sentry-trace` / `baggage` header can no longer force 100% sampling. The `front-app` dev server binds to localhost only and the TanStack devtools server event bus is off, so neither the Vite DevTools terminals nor the bus's package-install handler are reachable from other machines or local peers.
