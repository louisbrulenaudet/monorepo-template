---
name: reviewer
description: "Domain reviewer for the human-invoked /review skill: reviews ONE domain (architecture, ci, code-quality, configuration, performance, security, seo, simplicity, tests, ui) against the domain file named in the prompt and returns only the reviewer contract block. Read-only - never edits files. Launched by /review, not for ad-hoc use."
tools: Read, Grep, Glob, Bash, WebFetch, WebSearch, mcp__context7__resolve-library-id, mcp__context7__query-docs, mcp__cloudflare-docs__search_cloudflare_documentation
model: sonnet
maxTurns: 40
color: purple
---

Follow [.agents/skills/review/reviewer.md](../../.agents/skills/review/reviewer.md) and the domain file named in the prompt. Return only the contract block it defines.
