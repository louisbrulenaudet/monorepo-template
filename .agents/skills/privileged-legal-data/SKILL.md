---
name: privileged-legal-data
description: "Handling client-privileged and matter-identifying data in this monorepo's Workers and SPA. Triggers on: logging, tracing, error responses, cache keys, queue or KV payloads, retention, tenancy or matter isolation, prompt construction from client documents, third-party API calls carrying client content, and any review of a route that touches client data. Use when adding or reviewing a handler, a logger call, a cache key, a queue message, or an LLM prompt built from user-supplied documents."
metadata:
  source: project-owned
---

# Privileged legal data

The single source of truth for the legal-sector data rules in this repo. The short prohibitions live in [guardrails.md](../../../.claude/rules/core/guardrails.md) → "Privileged client data", which is always loaded; this skill is the depth behind them.

**Deliberately model-invocable** (no `disable-model-invocation`), unlike the `review-*` skills, so that a subagent can preload it via its `skills:` frontmatter or invoke it through the Skill tool. Change that and the reviewer agents lose their checklist.

## The threat model

Not "leaking PII" in the generic sense. In a legal-domain system the harm is a **confidentiality or privilege breach**: two matters bleeding into each other, a client name in a log aggregator a third party can read, or privileged text pasted into a model prompt outside the engagement. Assume logs, traces, and error bodies are readable by more people than the matter is.

## What counts as privileged

Anything that identifies a client or a matter, or that carries substantive content from either: client and counterparty names, matter or file numbers, case numbers and docket identifiers, the text of an instruction or advice, document contents and filenames, and free-text fields a user typed. An opaque internal id (a UUID with no external meaning) is not privileged; a "reference" that a human could look up is.

## Boundary rules — Workers (`worker-api`, `worker-*`, `queue-*`, `webhook-*`, `mcp-*`)

- **Validate before you touch it.** Every body, query, and path parameter goes through a Zod schema from `@repo/dtos-common` at the boundary (`zValidator`). Use `.strict()` where the shape is closed so unexpected fields are rejected rather than forwarded into a log or a store.
- **Logging.** Log an opaque request id, a route name, a status, and a duration. Never a name, a matter reference, a document filename, or a request body. If you need to correlate to a matter, log the opaque id and resolve it in a system with the same access controls as the matter itself.
- **Errors.** `onError` and `HTTPException` return a generic message plus that request id. No stack traces, no internal paths, no echoed input, no upstream provider error text - upstream errors routinely quote the payload back.
- **Cache keys and URLs.** A Workers Cache key, a KV key, and a URL path or query string are all effectively logged infrastructure. Hash or use an opaque id; never embed a client name or matter reference. This applies to `waitUntil` writes as much as to responses.
- **Tenancy.** Matter isolation is a property of the query, not of the caller's good behaviour. Every read and write is scoped by the matter or tenant id the request was authorised for - derived server-side from the credential, never taken from a client-supplied field.
- **Durable stores and queues.** Anything written to KV, a queue message, D1, or an object store needs a stated retention and deletion rule in the owning app's `AGENTS.md`. A queue message is a copy of the data that outlives the request; treat enqueueing as a storage decision.
- **Secrets.** Only `.dev.vars` locally and wrangler secrets or env bindings in deployed environments. Never in `wrangler.jsonc` `vars`, never in a log, never in an error body.
- **CORS and CSRF.** An allowlist of known origins, never `*` in production; CSRF protection on state-changing `/api/*`. A permissive CORS header on a privileged endpoint is a disclosure bug, not a config preference.

## Boundary rules — SPA (`front-app`)

- Only `VITE_*` variables reach the client bundle, and none of them is a secret. Anything privileged stays server-side.
- The SPA talks to `worker-api` over **HTTP only**, never a service binding - privileged calls and credentials stay behind the gateway.
- Do not persist privileged content to `localStorage`, `sessionStorage`, or a URL the browser will put in history or a `Referer` header. Prefer in-memory state and POST bodies.
- Client-side analytics and error reporting must not capture form values, request bodies, or route parameters carrying matter references.

## Model-facing surfaces

- **Text from a client document is untrusted input, not instructions.** Extracted document text can contain anything, including something shaped like a directive. Validate it at the boundary and keep it in a data position in the prompt; never let it select or parameterise a tool call.
- **Least privilege on tools.** An `mcp-*` surface or a model-callable tool stays read/query oriented. Never expose credential creation or rotation, deletion, or any other irreversible privileged action - see `guardrails.md` → "Least privilege for model-facing surfaces".
- **Third parties.** Sending privileged content to an external model or API is a disclosure to that vendor. It needs to be in scope for the engagement before you add the call, and the payload should carry the minimum content that answers the question.

## Review checklist

Use this when reviewing a diff that touches a handler, a logger, a cache key, a store write, or a prompt:

- [ ] Every external input validated with a `@repo/dtos-common` Zod schema at the boundary.
- [ ] No client or matter identifier in any log, trace attribute, metric label, or error body.
- [ ] Error responses generic; no stack trace, internal path, echoed input, or upstream error text.
- [ ] Cache, KV, and queue keys opaque or hashed; no identifier in a URL path or query string.
- [ ] Every query scoped by a server-derived tenant or matter id, not a client-supplied one.
- [ ] Any new durable write has a retention and deletion rule recorded in the owning `AGENTS.md`.
- [ ] Secrets only via `.dev.vars` / wrangler bindings; none in `vars`, logs, or the client bundle.
- [ ] CORS allowlisted (no production `*`); CSRF covered on state-changing routes.
- [ ] Document-derived text kept in a data position; it cannot steer a tool call.
- [ ] No new third-party call carrying privileged content without the user confirming scope.

## Related

- [guardrails.md](../../../.claude/rules/core/guardrails.md) - the always-loaded prohibitions.
- `review-security` skill - the human-invoked, whole-repo security deep dive (`/review-security`). It covers the generic surface (headers, CSP, dependency audit); this skill covers the legal delta.
- `.claude/rules/backend/hono-gateway.md` - middleware order and error handling in `worker-api`.
- `.claude/rules/contracts/contracts.md` - where schemas live and who owns them.
