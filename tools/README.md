# tools/

Scripts for tasks we repeat. Each tool is one executable file that does one thing, so it can be run by hand, from CI, or by an AI assistant.

| Tool | What it does |
|---|---|
| `render-diagrams.sh` | Renders every `docs/*.mmd` Mermaid file to a PNG next to it |

Planned (added once the code they test exists):

| Tool | What it will do |
|---|---|
| `test-api.sh` | Starts Postgres with Docker Compose and runs the API tests (Vitest + Supertest) |
| `test-web.sh` | Starts the web app and runs the front-end checks (approval-screen flow in a real browser) |
| `check.sh` | Runs lint, typecheck and tests, the same steps as CI |

## Conventions

- Run from anywhere: each script finds the repo root by itself.
- Fail loudly: `set -euo pipefail` and a non-zero exit code on failure.
- Add a line to the table above whenever you add a tool.
