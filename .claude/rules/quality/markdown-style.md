---
paths:
  - "**/*.md"
  - "**/*.mdc"
---

# Markdown Style

Markdown here is **never hard-wrapped**, and no formatter reflows it: oxfmt runs with `proseWrap: preserve` and skips agent-loaded files ([lint-config.md](lint-config.md)). Long single lines (250-700 characters) are correct, not a defect.

- One line per paragraph, list item, and table row, however long; never split a sentence or reflow to a column limit.
- In Markdown oxfmt ignores, keep tables unpadded (`|---|---|`).
- Frontmatter string values stay on one line; never fold a long `description:`.
- Headings, table rows, and fenced code contents keep their own lines.
- A GitHub alert marker stays on its own line above its body (`> [!NOTE]`, then `> <body>`); collapsing them stops GitHub rendering the alert.
