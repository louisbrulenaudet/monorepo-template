@AGENTS.md

## Claude Code

- Correlation ids are opaque UUID v4 only - never matter/client identifiers.
- Wire header stays `X-Request-Id`; do not rename it when editing this package.
- Browser `sessionStorage` wrappers stay in `front-app`; do not add DOM storage APIs here.
