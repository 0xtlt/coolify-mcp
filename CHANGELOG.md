# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-02-06

### Added

- **Safety modes**: `COOLIFY_READONLY` blocks write/destructive operations, `COOLIFY_REQUIRE_CONFIRM` requires `confirm: true` for destructive operations (stop, restart, delete)
- **Response optimization**: List operations now return summaries (uuid, name, status) instead of full API objects — 90%+ token savings
- **HATEOAS actions**: `get_application` responses include `_actions` hints for next steps based on app status
- **Shared utilities**: `wrap()` and `wrapWithActions()` helpers eliminate duplicated error handling
- **Shared Zod schemas**: UUID validation with regex to prevent path injection
- **Test suite**: 44 unit tests covering filters, errors, client, and config
- **GitHub Actions CI**: Lint, typecheck, and test on every push/PR
- **MIT LICENSE** file
- **CHANGELOG.md**

### Changed

- Tool descriptions now prefixed with `[WRITE]` or `[DESTRUCTIVE]` to indicate risk level
- HTTP methods for start/stop/restart fixed from GET to POST (matching Coolify API)
- Tool registration functions now accept `config` parameter for safety mode support
- Resources (coolify://) now return summaries instead of full objects

### Fixed

- `formatError()` no longer duplicated across 4 files — centralized in `lib/wrap.ts`

## [1.0.0] - 2025-12-01

### Added

- Initial release with 9 MCP tools
- Application management (list, get, start, stop, restart)
- Deployment management (list, get, trigger)
- Log retrieval with filtering (level, time range, text search, limit, tail)
- 3 MCP resources (applications, deployments, servers)
