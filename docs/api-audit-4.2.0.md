# Coolify API audit for MCP 4.2.0

Audited on 2026-10-08. The latest published Coolify release was [v4.4.2](https://github.com/coollabsio/coolify/releases/tag/v4.4.2), commit `76d3386a4d69f894258210ea265717a8fb8cd778`. The previous MCP release was aligned with v4.3.23 (`e2e2d4010bcd590084b66d6f748f3eec8e2bbee9`). The range covers v4.4.0, v4.4.1 and v4.4.2.

## Sources and scope

Compared [release routes](https://github.com/coollabsio/coolify/blob/76d3386a4d69f894258210ea265717a8fb8cd778/routes/api.php), the [release OpenAPI](https://github.com/coollabsio/coolify/blob/76d3386a4d69f894258210ea265717a8fb8cd778/openapi.yaml), and the validation code of every changed controller under `app/Http/Controllers/Api` between the two tags. Contracts below come from controller validation rules, not from annotations alone.

This update wraps every route added in the range except the multipart upload endpoints, and aligns the existing tools with the contracts that changed. The gaps listed in the 4.1.0 audit (cloud provisioning, server proxy and Sentinel settings, notifications, shared environment variables, tags, S3 management, GitLab integrations, service sub-resources) are unchanged.

## Released endpoint additions

| Method and path | MCP tool | Verified contract |
|---|---|---|
| `GET /applications/{uuid}/previews` | `coolify_list_application_previews` | Array of previews; the tool returns a summary |
| `GET /applications/{uuid}/previews/{pull_request_id}` | `coolify_get_application_preview` | PR ID 1-2147483647; `404` when no preview exists |
| `POST /applications/{uuid}/previews` | `coolify_deploy_application_preview` | `deploy` ability. Git apps: optional `git_type` (required without a GitHub/GitLab App source) and `commit` (7-40 hex, required for Bitbucket); `docker_tag` must be absent. Docker Image apps: `docker_tag` (required for a new preview); `git_type` and `commit` must be absent. `instant_deploy` defaults to true; `201` on create, `200` on redeploy, `429` when the queue is full |
| `POST /databases/{uuid}/imports` | `coolify_import_database` | `source` is `upload`, `s3` or `server`. `upload_id` only with `upload`; `s3_storage_uuid` only with `s3`; `path` required for `s3` and `server`, prohibited for `upload`. Optional `dump_all`, `replace_existing`, `keep_owners`, `restore_mysql_users`, `sqlite_database`. `server` also needs `deploy`. `202` with `id` and `status_url`; `409` while another operation runs; `422` when the database is not running |
| `GET /databases/{uuid}/imports/{activity_id}` | `coolify_get_database_import` | `status`, `exit_code`, `finished_at`; `output` only with `read:sensitive` |
| `POST /services/{uuid}/databases/{database_uuid}/imports` | `coolify_import_service_database` | Same body as the standalone import |
| `GET /services/{uuid}/databases/{database_uuid}/imports/{activity_id}` | `coolify_get_service_database_import` | Same response as the standalone status |
| `GET /servers/{uuid}/registries` | `coolify_list_server_registries` | `read:sensitive` ability. `{ registries, error }`; `error` is set when the server is unreachable |
| `POST /servers/{uuid}/registries` | `coolify_login_server_registry` | `registry` (host with optional port, max 255), `username` (no spaces), `password` (max 20000); other fields are rejected |
| `POST /servers/{uuid}/registries/{registry}/check` | `coolify_check_server_registry` | Changes nothing but needs `write`; `400` when the server is unreachable |
| `DELETE /servers/{uuid}/registries/{registry}` | `coolify_logout_server_registry` | Destructive in the MCP: confirmation and readonly controls apply |
| `POST /security/integration-tokens` | `coolify_create_integration_token` | `provider` is `doppler`, `infisical` or `vault`. Doppler tokens start with `dp.st.` or `dp.sa.`; Infisical needs `metadata.base_url` and `metadata.client_id`; Vault needs `metadata.base_url`. Coolify verifies the token with the provider and answers `400` when that fails |
| `PATCH /applications/{uuid}/secret-manager` | `coolify_update_application_secret_manager` | `integration_token_uuid` plus provider `settings`: Doppler service account `project` + `config`; Infisical `project_id` + `environment` (+ `secret_path`); Vault `mount` + `path`. `404` for an unknown token |
| `GET /audit-events` | `coolify_list_audit_events` | Team admin/owner token. `page`, `per_page` (1-100, default 25), `search`, `action`, `source` (`all`, `ui`, `api`, `mcp`, `webhook`, `system`, `scheduler`). Laravel paginator response; actor email, token, metadata, changes and IP only with `read:sensitive` |
| `PATCH /team` | `coolify_update_current_team` | Exactly `is_build_server_fallback_enabled` (boolean, required) |
| `POST /databases/sqlite` | `coolify_create_database` with `type: "sqlite"` | Optional `sqlite_databases` (comma-separated file names). No `is_public` or `public_port` |

The registry host goes into the URL path percent-encoded; a port such as `registry.example.com:5000` was verified against a live v4.4.2 instance.

## Not wrapped

- `POST /databases/{uuid}/imports/uploads` and `POST /services/{uuid}/databases/{database_uuid}/imports/uploads` take a chunked multipart upload of up to 10 GiB. A stdio MCP tool would have to read local files and stream them, which is outside what this server does. Imports from S3 or a server path cover the same need, and an `upload_id` obtained elsewhere is accepted by the import tools.

## Removed upstream

- `POST /servers/{uuid}/claim` no longer exists. The MCP never wrapped it.

## Existing contract changes

- **Logs:** `GET /applications/{uuid}/logs`, `.../previews/{pull_request_id}/logs`, `GET /databases/{uuid}/logs` and `GET /services/{uuid}/logs` moved from the `read` to the `read:sensitive` ability. The MCP requests are unchanged; tokens need the new ability. The `403` message of the MCP now says so.
- **Application logs:** new `service_name` query parameter selects a Compose service container and answers `404` when none matches. Exposed on `coolify_get_logs` and `coolify_get_application_preview_logs`.
- **Servers:** `server_role` (`deployment`, `build`, `both`) on create and update; `is_build_server` is deprecated and answers `422` when it disagrees with `server_role`, which the MCP rejects before the request. `server_disk_usage_notification_interval_hours` (1-720) on update. `delete_from_provider` on delete (`422` when the server is not linked to a provider or the team has no token for it).
- **Applications:** `custom_container_name_prefix` on create and update (slugified, unique per server). `custom_internal_name` turns consistent container naming on. `instant_deploy` needs `deploy`.
- **Databases:** create requests are validated (`422`), accept numeric limits, and `instant_deploy` needs `deploy`. Start and restart answer `409` while another operation runs and `422` on a failed prerequisite. A SQLite database whose volume is mounted by applications cannot be deleted (`422`).
- **Services:** `delete_from_coolify_only` on delete. `instant_deploy` needs `deploy`.
- **Volume backups:** `missing_backup_notification_days` (0-365) on `PUT .../storages/{storage_uuid}/backups` (v4.4.1).
- **Scheduled tasks:** `timeout` is validated as 1-36000 seconds. `command` and execution `message` are hidden without `read:sensitive`.
- **Pull request IDs** above 2147483647 are rejected by every preview endpoint; the MCP validates the same bound.
- Other changes to covered endpoints are server-side behavior (storage path confinement, deployment queueing, DNS record cleanup, audit logging). Paths, methods and payloads of the existing tools remain valid.

## Verification

- In-memory MCP client/server tests exercise the tool schemas, handlers, HTTP requests and safety controls of every new tool and option.
- Docker integration tests pin `ghcr.io/coollabsio/coolify:4.4.2`. The full existing suite passes unchanged, and `19-v4-4-endpoints` adds real API calls for audit events, team update, preview create/read/list/delete without deployment, SQLite creation, import status, registry listing, secret manager linking and the server notification interval.
- Not exercised against a live instance, because the test fixture has no reachable server or provider account: a successful registry login, a running import, a verified integration token, and `delete_from_provider`. Their payloads are covered by the contract tests and the controller rules above.
- The stdio server was checked for version 4.2.0 and 136 tools / 7 resources / 4 prompts (52 tools in readonly mode).
