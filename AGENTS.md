# AGENTS.md

## Cursor Cloud specific instructions

`coolify-mcp` (npm `mcp-coolify`) is a **stdio-based MCP server** (TypeScript, ESM, pnpm) that wraps the Coolify v4.3+ REST API. It exposes 116 tools / 7 resources / 4 prompts. It has **no HTTP server and opens no port** — it speaks the MCP protocol over stdin/stdout and is launched by an MCP client. At runtime it needs `COOLIFY_API_URL` and `COOLIFY_TOKEN` and network access to a reachable Coolify instance; it `process.exit(1)`s immediately if either is missing/invalid.

Standard dev commands live in `package.json` scripts and `README.md` (`pnpm run dev`, `pnpm start`, `pnpm run build`, `pnpm run typecheck`, `pnpm test`/`pnpm run test:unit`). Lint/format is Biome; CI runs `pnpm exec biome check .` (no `--write`) — note `pnpm run check` uses `biome check --write` and will modify files. Dependencies are refreshed automatically by the startup update script (`pnpm install`).

### Running the server / unit tests (no external services)

- `pnpm run test:unit`, `pnpm run typecheck`, and `pnpm exec biome check .` need no Docker and no Coolify instance.
- To smoke-test the server itself you must give it a live Coolify instance (see below) and drive it as an MCP client over stdio (`node dist/index.js` or `pnpm start`).

### End-to-end / integration tests require Docker + a real Coolify (non-obvious)

GitHub Actions (`.github/workflows/integration.yml`) runs the integration suite against a **real Coolify API** — not mocks. Locally, the same path (`pnpm run test:integration*`) spins up a real Coolify + Postgres + Redis via `docker-compose.test.yml`. Unit tests in `.github/workflows/ci.yml` stay mocked and do not need Coolify.

- Docker is **not** part of the update script and is **not** running by default. Install Docker (Docker CE + compose plugin) and start `dockerd` yourself. In this VM the working storage driver is `fuse-overlayfs` (set in `/etc/docker/daemon.json`) and iptables must be `iptables-legacy`; start the daemon in a tmux session with `sudo dockerd`. Add the `ubuntu` user to the `docker` group (`sudo usermod -aG docker ubuntu`) and, because the current shell won't pick up the new group, run docker-dependent commands via `sg docker -c "..."`.
- **Compose project name must be `coolify-mcp`.** `scripts/integration-setup.ts` hardcodes `docker exec coolify-mcp-coolify-1`, which only exists when the Compose project is named `coolify-mcp`. Since this repo is checked out at `/workspace`, Compose otherwise derives the project name `workspace` and the bootstrap step times out with "InstanceSettings not ready". Always export `COMPOSE_PROJECT_NAME=coolify-mcp` for every integration command (setup, run, teardown), e.g. `sg docker -c "COMPOSE_PROJECT_NAME=coolify-mcp pnpm run test:integration:setup"`.
- Setup writes the minted API token and seeded resource UUIDs to `/tmp/coolify-integration-state.json`; the test Coolify API is at `http://localhost:8099/api/v1`. Teardown: `COMPOSE_PROJECT_NAME=coolify-mcp pnpm run test:integration:teardown`.
