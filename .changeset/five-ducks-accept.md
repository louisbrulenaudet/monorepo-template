---
"worker-api": patch
"front-app": patch
---

Upgrade Zod to 4.5, cutting retained memory per schema by roughly 7.5-10x

The `safeParse` failure path is faster too, which matters on Workers, where isolate memory and cold-start CPU are the binding constraints.
