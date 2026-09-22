# Coolify API audit for MCP 4.1.0

Audited on 2026-09-22. The latest published Coolify release was [v4.3.23](https://github.com/coollabsio/coolify/releases/tag/v4.3.23), commit `e2e2d4010bcd590084b66d6f748f3eec8e2bbee9`. The previous MCP release was aligned with v4.3.0 (`54c735b6736b5130de5befa09a8d6538cb4aa59a`).

## Sources and scope

Compared the [official API overview](https://coolify.io/docs/api/overview), [release OpenAPI](https://github.com/coollabsio/coolify/blob/e2e2d4010bcd590084b66d6f748f3eec8e2bbee9/openapi.yaml), [release routes](https://github.com/coollabsio/coolify/blob/e2e2d4010bcd590084b66d6f748f3eec8e2bbee9/routes/api.php), and controller changes between v4.3.0 and v4.3.23. Checked all 132 client HTTP method/path combinations (including source/database-type variants) against the release routes.

This update covers every new public route added between those two releases, plus preview deletion and corrections to existing MCP request schemas. It does not claim complete coverage of all pre-existing Coolify APIs: cloud provisioning, server proxy/maintenance, notifications, shared environment variables, tags, S3 management, GitLab integrations, resource migration/cloning, and service sub-resource management still have unwrapped operations.

## Released endpoint additions

| Method and path | MCP tool | Verified contract |
|---|---|---|
| `GET /applications/{uuid}/previews/{pull_request_id}/logs` | `coolify_get_application_preview_logs` | Positive integer PR ID; `lines` and `show_timestamps` query parameters; response `{ logs: string }` |
| `PATCH /applications/{uuid}/previews/{pull_request_id}` | `coolify_update_application_preview` | Exactly one of `domains` or `docker_compose_domains`; optional `force_domain_override` |
| `GET /settings/email` | `coolify_get_instance_email_settings` | Root-team admin/owner token; sensitive fields depend on token ability |
| `PATCH /settings/email` | `coolify_update_instance_email_settings` | Partial SMTP/Resend settings; nullable fields; `write:sensitive` ability |
| `DELETE /applications/{uuid}/previews/{pull_request_id}` (previously unwrapped) | `coolify_delete_application_preview` | Deletes preview resources; covered by readonly and confirmation controls |

The release's generated OpenAPI includes preview logs but **omits preview PATCH and email settings**. Those contracts come from [ApplicationsController](https://github.com/coollabsio/coolify/blob/e2e2d4010bcd590084b66d6f748f3eec8e2bbee9/app/Http/Controllers/Api/ApplicationsController.php) and [InstanceEmailSettingsController](https://github.com/coollabsio/coolify/blob/e2e2d4010bcd590084b66d6f748f3eec8e2bbee9/app/Http/Controllers/Api/InstanceEmailSettingsController.php), including validation rules rather than annotations alone. For example, Compose preview domains must be an array, even though the annotation suggests null is allowed.

## Existing contract corrections

- **Application/database/service storages:** `host_path` was removed from both create and update allowlists. `is_host_file` is accepted by controllers but omitted from the generated create schema. Keep the obsolete MCP input only to return explicit migration guidance; never silently drop it. Host mounts use `type=file`, `fs_path`, and `is_directory` or `is_host_file` on creation.
- **Database backup schedules:** [DatabasesController](https://github.com/coollabsio/coolify/blob/e2e2d4010bcd590084b66d6f748f3eec8e2bbee9/app/Http/Controllers/Api/DatabasesController.php) requires `frequency` on creation. A bodyless POST was invalid. Creation optionally runs the backup with `backup_now`. Both create/update accept `missing_backup_notification_days` (0–365), retention fields, S3 UUID, and timeout. `s3_storage_id` and `database_name_prefix` are not accepted input fields.
- **Logs:** application, preview, database, and service controllers accept `lines=all`, the `-1` alias, and `show_timestamps`. The MCP retains its bounded filtered output through `limit`.
- **Volume backups:** [VolumeBackupsController](https://github.com/coollabsio/coolify/blob/e2e2d4010bcd590084b66d6f748f3eec8e2bbee9/app/Http/Controllers/Api/VolumeBackupsController.php) validates timeout as 60–36000 seconds. Leaving it omitted preserves the upstream default/existing value.
- Other release changes to existing covered endpoints are server-side behavior changes (e.g. cancellation cleanup, domain normalization, delete processing and authorization responses); the existing MCP paths/methods remain valid.

## Unreleased main branch

Also inspected [main at `8a0d21e6f26b48f40e07ac0a69a198709f8f21eb`](https://github.com/coollabsio/coolify/blob/8a0d21e6f26b48f40e07ac0a69a198709f8f21eb/routes/api.php). It adds audit events, current-team updates, integration-token creation, application secret-manager configuration, and database/service-database import uploads, imports, and import status. These routes are absent from v4.3.23 and are intentionally excluded from this stable release. Re-audit them after the next Coolify release.

## Verification

- In-memory MCP client/server tests exercise the actual tool schemas, handlers, HTTP requests and safety controls.
- Docker integration tests pin `ghcr.io/coollabsio/coolify:4.3.23`, with `COMPOSE_PROJECT_NAME=coolify-mcp`, and exercise real API calls including email settings, disabled backup schedules and host-file storage.
- Preview payloads and filtering are covered by MCP contract tests; runtime preview containers are not deployed by the integration fixture.
- The built stdio server is checked for version 4.1.0 and tool/resource/prompt registration against the local test instance.
