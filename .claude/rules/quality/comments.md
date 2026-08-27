---
---

# Comments

Do not add a comment that restates the code. A comment earns its place only when it records something a reader cannot recover from the code and would otherwise undo: a constraint, a rejected alternative, a non-obvious requirement of an external API. Write the **why**, never the **what**.

- **Default to no comment.** If a line needs explaining, rename something or restructure it first. A comment is the fallback, not the first move.
- **Never write a comment for an AI reader.** Path-scoped rules under `.claude/rules/` (mirrored in `.cursor/rules/`) are the channel for that, and they cost context only when a matching file is touched. A comment costs context every time anyone reads the file, forever, and pushes the code apart while it does.
- **If the explanation runs past two lines, or applies to more than the line below it, it belongs in a rule** - not a comment block at the top of a file. The exception is a config file whose comments are already the documented source of truth: root `turbo.json` task descriptions and `wrangler.jsonc` annotations are cited as authoritative by [../core/turborepo.md](../core/turborepo.md) and [../backend/workers-config.md](../backend/workers-config.md). Extend those in place; do not strip them into a rule.
- **Keep the comments that prevent a regression:** why a key is deliberately absent, why a non-default value is set, why an apparently redundant line is load-bearing. The test is simple - deleting it should feel risky. If deleting it changes nothing, it should not be there.
- Applies to source, YAML and workflows, shell, and config alike.
- **Not covered by this rule:** JSDoc/docstrings carrying types or a public API contract, `@internal` tags Knip depends on, and `oxlint-disable-*` directives, which [code-style.md](code-style.md) requires to carry a reason. Those are machine-read, not prose.
