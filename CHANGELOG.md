# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [4.2.0] - 2026-10-08

Audited against Coolify **v4.4.2** (`76d3386a4d69f894258210ea265717a8fb8cd778`), from v4.3.23. See [API audit](docs/api-audit-4.2.0.md).

### Added

- Fifteen tools (136 total), all for Coolify v4.4+:
  - Previews: `coolify_list_application_previews`, `coolify_get_application_preview`, `coolify_deploy_application_preview`.
  - Database imports: `coolify_import_database`, `coolify_get_database_import`, `coolify_import_service_database`, `coolify_get_service_database_import`.
  - Docker registry logins: `coolify_list_server_registries`, `coolify_login_server_registry`, `coolify_check_server_registry`, `coolify_logout_server_registry`.
  - Secret managers: `coolify_create_integration_token`, `coolify_update_application_secret_manager`.
  - `coolify_list_audit_events` and `coolify_update_current_team`.
- SQLite as a `coolify_create_database` type, with `sqlite_databases`.
- `service_name` on application and preview logs to pick a Compose service container.
- `server_role` on server create/update, `server_disk_usage_notification_interval_hours` on server update, and `delete_from_provider` on server delete.
- `custom_container_name_prefix` on application create/update.
- `delete_from_coolify_only` on service delete.
- `missing_backup_notification_days` on volume backup schedules (Coolify v4.4.1).

### Changed

- Integration tests pin Coolify **4.4.2**; the whole suite, including the new endpoints, passes against it.
- Scheduled task `timeout` is validated against Coolify's 1-36000 second bounds.
- The `403` error message points to the token abilities Coolify v4.4 now requires (`read:sensitive` for logs, `deploy` for `instant_deploy`).
- Database imports and registry logout are destructive tools: blocked in readonly mode and confirmed with `confirm: true` when `COOLIFY_REQUIRE_CONFIRM` is set.

### Compatibility

- No tool was removed or renamed. Coolify v4.3.x keeps working with the tools that existed in 4.1.0.
- On Coolify v4.4+, log tools need a token with `read:sensitive`. This is an upstream change, not an MCP change.

## [4.1.0] - 2026-09-22

Audited against Coolify **v4.3.23** (`e2e2d4010bcd590084b66d6f748f3eec8e2bbee9`), including controller validation where the generated OpenAPI document is stale. See [API audit](docs/api-audit-4.1.0.md).

### Added

- Five tools (121 total): preview runtime logs, preview domain replacement, preview deletion, and instance email settings read/update.
- Log options `lines` (including `"all"` and `-1`) and `show_timestamps`; server timestamps default to enabled for time filtering.
- `is_host_file` for application, database, and service storage creation.
- Database backup schedule options including `missing_backup_notification_days`, S3 UUID, retention, and timeout.
- MCP protocol contract tests for request validation, HTTP payloads, log filtering, readonly mode, and destructive confirmation; live tests for settings, backup schedules, and host-file mounts.

### Fixed

- Database backup creation now sends the required `frequency` and optional `backup_now`, and preserves the created schedule UUID.
- Backup updates use `s3_storage_uuid` instead of invalid `s3_storage_id`; the unsupported `database_name_prefix` input is removed.
- Storage calls with obsolete `host_path` fail locally with migration guidance instead of sending a rejected request or silently changing mount semantics. Use `type: "file"`, `fs_path`, and `is_directory`/`is_host_file` for host mounts.
- Volume backup timeouts are validated against Coolify's 60–36000 second bounds.
- Installation examples use the published package name, `mcp-coolify`.

### Changed

- Integration tests pin Coolify **4.3.23** and set the required Compose project name in CI.
- New preview/email features are verified on v4.3.23; existing v4.3+ operations remain available. Unreleased main-branch APIs are documented separately, not registered as stable tools.

## [4.0.0] - 2026-08-12

Aligned with Coolify **v4.3.0** / `main` API (`routes/api.php` + OpenAPI). Requires Coolify v4.3+.

### Breaking

- State-changing calls that still used **GET** now use **POST** (Coolify returns `405` on legacy GET):
  - `POST /deploy` (was GET)
  - `POST /servers/{uuid}/validate` (was GET)
  - `POST /databases/{uuid}/start|stop|restart` (was GET)
- Current team endpoint is **`GET /team`** (deprecated `GET /teams/current` no longer used)
- Storage APIs match Coolify v4.3 shapes:
  - List returns `{ persistent_storages, file_storages }` (normalized by the client)
  - Create requires `type` (`persistent` | `file`); service create also requires `resource_uuid`
  - Update is `PATCH /{resource}/{uuid}/storages` with `uuid` + `type` in the body (not in the path)
- `coolify_validate_server` is a **write** tool (API requires write ability)
- Tooling switched from **Bun** to **pnpm** (Node.js + vitest + tsup + tsx)

### Added

- Volume/storage backup tools (Coolify v4.3 scheduled volume backups): set / run / delete for application, database, and service storages
- `coolify_get_current_team_members` (`GET /team/members`)
- Optional `install` flag on server validation

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
