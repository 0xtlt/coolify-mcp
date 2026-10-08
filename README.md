# coolify-mcp

MCP server for managing Coolify instances (**v4.3+ API**). Control applications, databases, services, servers, and more directly from Claude or any MCP-compatible client.

**136 tools | 7 resources | 4 prompts**

Requires Coolify **v4.3.0** or newer (`/api/v1`); **v4.4.2 is recommended** and is the integration-test target for MCP **4.2.0**. Tools and options marked *v4.4+* need Coolify v4.4.0 or newer and answer `404` or `422` on older instances. Legacy GET-based state-changing endpoints are not supported.

See the [4.2.0 API audit](docs/api-audit-4.2.0.md) for pinned upstream sources, compatibility changes, and endpoints that are not wrapped. The [4.1.0 audit](docs/api-audit-4.1.0.md) covers v4.3.23.

## Installation

### Claude Code

```bash
claude mcp add coolify \
  -e COOLIFY_API_URL=http://your-server:8000/api/v1 \
  -e COOLIFY_TOKEN=your-token \
  -- npx mcp-coolify
```

### Codex

```bash
codex mcp add coolify \
  --env COOLIFY_API_URL=http://your-server:8000/api/v1 \
  --env COOLIFY_TOKEN=your-token \
  -- npx mcp-coolify
```

### Other MCP clients

```bash
COOLIFY_API_URL=http://your-server:8000/api/v1 \
COOLIFY_TOKEN=your-token \
npx mcp-coolify
```

### From source

```bash
git clone https://github.com/0xtlt/coolify-mcp
cd coolify-mcp && pnpm install
COOLIFY_API_URL=... COOLIFY_TOKEN=... pnpm start
```

### Claude Desktop

Add to `~/.claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "coolify": {
      "command": "pnpm",
      "args": ["exec", "tsx", "/path/to/coolify-mcp/src/index.ts"],
      "env": {
        "COOLIFY_API_URL": "http://your-server:8000/api/v1",
        "COOLIFY_TOKEN": "your-token"
      }
    }
  }
}
```

### Get your API token

Coolify dashboard: **Keys & Tokens > API tokens**

On Coolify v4.4+ pick the token abilities for what you want to do:

| Ability | Needed for |
|---------|------------|
| `read` | List and get tools |
| `read:sensitive` | All log tools, `coolify_list_server_registries`, secrets in responses, audit event details, import output |
| `write` | [WRITE] and [DESTRUCTIVE] tools |
| `deploy` | Deploy, start, stop and restart tools, `instant_deploy`, `coolify_deploy_application_preview`, database imports from a server path |

## Available Tools

### Applications (8)

| Tool | Description |
|------|-------------|
| `coolify_list_applications` | List all applications (summary) |
| `coolify_get_application` | Get application details |
| `coolify_create_application` | [WRITE] Create from public/private repo, Dockerfile, or Docker image |
| `coolify_update_application` | [WRITE] Update application config |
| `coolify_start_application` | [WRITE] Start a stopped application |
| `coolify_stop_application` | [DESTRUCTIVE] Stop an application |
| `coolify_restart_application` | [DESTRUCTIVE] Restart an application |
| `coolify_delete_application` | [DESTRUCTIVE] Delete an application |

### Preview Deployments (6)

Each tool takes the parent application `uuid`; all but the list take a `pull_request_id` between 1 and 2147483647. List, get and deploy need Coolify v4.4+.

| Tool | Description |
|------|-------------|
| `coolify_list_application_previews` | List previews of an application (summary) |
| `coolify_get_application_preview` | Get one preview with its domains and status |
| `coolify_deploy_application_preview` | [WRITE] Open or redeploy the preview of a pull request (`git_type`/`commit` for Git apps, `docker_tag` for Docker Image apps) |
| `coolify_get_application_preview_logs` | Read preview runtime logs with the same filters as application logs |
| `coolify_update_application_preview` | [WRITE] Replace preview domains using `domains` or `docker_compose_domains` |
| `coolify_delete_application_preview` | [DESTRUCTIVE] Remove the preview, its containers, volumes, and networks |

### Databases (11)

| Tool | Description |
|------|-------------|
| `coolify_list_databases` | List all databases (summary) |
| `coolify_get_database` | Get database details |
| `coolify_create_database` | [WRITE] Create PostgreSQL, MySQL, MariaDB, MongoDB, Redis, KeyDB, Dragonfly, ClickHouse, or SQLite (v4.4+) |
| `coolify_update_database` | [WRITE] Update database config |
| `coolify_list_database_backups` | List backups for a database |
| `coolify_create_database_backup` | [WRITE] Create a backup schedule (`frequency` required, optional `backup_now`) |
| `coolify_delete_database_backup` | [DESTRUCTIVE] Delete a scheduled backup config |
| `coolify_start_database` | [WRITE] Start a stopped database |
| `coolify_stop_database` | [DESTRUCTIVE] Stop a database |
| `coolify_restart_database` | [DESTRUCTIVE] Restart a database |
| `coolify_delete_database` | [DESTRUCTIVE] Delete a database |

### Backup Schedule Updates & Executions (3)

| Tool | Description |
|------|-------------|
| `coolify_update_database_backup` | [WRITE] Update schedule, retention, S3 and missing-backup alerts |
| `coolify_list_backup_executions` | List execution history for a database backup schedule |
| `coolify_delete_backup_execution` | [DESTRUCTIVE] Delete a backup execution |

### Database Imports (4)

Coolify v4.4+. An import runs in the background: start it, then poll the status tool until `status` is `finished` or `error`. `source` is `s3` (`s3_storage_uuid` + `path`), `server` (absolute `path` on the database server) or `upload` (`upload_id` of a file sent to `POST .../imports/uploads`).

| Tool | Description |
|------|-------------|
| `coolify_import_database` | [DESTRUCTIVE] Restore a backup into a standalone database |
| `coolify_get_database_import` | Get the status of a standalone database import |
| `coolify_import_service_database` | [DESTRUCTIVE] Restore a backup into a database of a service |
| `coolify_get_service_database_import` | Get the status of a service database import |

### Services (8)

| Tool | Description |
|------|-------------|
| `coolify_list_services` | List all services (summary) |
| `coolify_get_service` | Get service details |
| `coolify_create_service` | [WRITE] Create a one-click Docker Compose service |
| `coolify_update_service` | [WRITE] Update service config |
| `coolify_start_service` | [WRITE] Start a stopped service |
| `coolify_stop_service` | [DESTRUCTIVE] Stop a service |
| `coolify_restart_service` | [DESTRUCTIVE] Restart a service |
| `coolify_delete_service` | [DESTRUCTIVE] Delete a service |

### Servers (8)

| Tool | Description |
|------|-------------|
| `coolify_list_servers` | List all servers (summary) |
| `coolify_get_server` | Get server details |
| `coolify_create_server` | [WRITE] Add a new server (requires SSH key) |
| `coolify_update_server` | [WRITE] Update server config |
| `coolify_validate_server` | [WRITE] Validate SSH connectivity and Docker (POST) |
| `coolify_get_server_resources` | List all resources on a server |
| `coolify_get_server_domains` | List all domains on a server |
| `coolify_delete_server` | [DESTRUCTIVE] Delete a server (`delete_from_provider` also deletes the cloud machine, v4.4+) |

### Docker Registry Logins (4)

Coolify v4.4+. Coolify runs `docker login` on the server and does not store the token. `registry` is a host such as `ghcr.io` or `registry.example.com:5000`.

| Tool | Description |
|------|-------------|
| `coolify_list_server_registries` | List registries a server is logged in to and the ones its applications need |
| `coolify_login_server_registry` | [WRITE] Log in to a registry or update the login |
| `coolify_check_server_registry` | [WRITE] Check that a stored login still works |
| `coolify_logout_server_registry` | [DESTRUCTIVE] Log out of a registry |

### Private Keys (5)

| Tool | Description |
|------|-------------|
| `coolify_list_private_keys` | List all SSH private keys (summary) |
| `coolify_get_private_key` | Get private key details |
| `coolify_create_private_key` | [WRITE] Create a new SSH key |
| `coolify_update_private_key` | [WRITE] Update an SSH key |
| `coolify_delete_private_key` | [DESTRUCTIVE] Delete an SSH key |

### Projects & Environments (9)

| Tool | Description |
|------|-------------|
| `coolify_list_projects` | List all projects (summary) |
| `coolify_get_project` | Get project details |
| `coolify_create_project` | [WRITE] Create a new project |
| `coolify_update_project` | [WRITE] Update a project |
| `coolify_delete_project` | [DESTRUCTIVE] Delete a project |
| `coolify_list_environments` | List environments in a project |
| `coolify_get_environment` | Get environment details |
| `coolify_create_environment` | [WRITE] Create an environment |
| `coolify_delete_environment` | [DESTRUCTIVE] Delete an environment |

### Deployments (5)

| Tool | Description |
|------|-------------|
| `coolify_list_deployments` | List currently running/queued deployments |
| `coolify_list_application_deployments` | List deployment history for an application (with pagination) |
| `coolify_get_deployment` | Get deployment details |
| `coolify_trigger_deploy` | [WRITE] Trigger a deployment (POST `/deploy`) |
| `coolify_cancel_deployment` | [WRITE] Cancel a running deployment |

### Application Env Vars (4)

| Tool | Description |
|------|-------------|
| `coolify_list_envs` | List env vars for an application |
| `coolify_create_env` | [WRITE] Create an env var |
| `coolify_update_envs_bulk` | [WRITE] Bulk update env vars |
| `coolify_delete_env` | [DESTRUCTIVE] Delete an env var |

### Service Env Vars (4)

| Tool | Description |
|------|-------------|
| `coolify_list_service_envs` | List env vars for a service |
| `coolify_create_service_env` | [WRITE] Create a service env var |
| `coolify_update_service_envs_bulk` | [WRITE] Bulk update service env vars |
| `coolify_delete_service_env` | [DESTRUCTIVE] Delete a service env var |

### Database Env Vars (4)

| Tool | Description |
|------|-------------|
| `coolify_list_database_envs` | List env vars for a database |
| `coolify_create_database_env` | [WRITE] Create a database env var |
| `coolify_update_database_envs_bulk` | [WRITE] Bulk update database env vars |
| `coolify_delete_database_env` | [DESTRUCTIVE] Delete a database env var |

### Storages (12)

| Tool | Description |
|------|-------------|
| `coolify_list_application_storages` | List application persistent + file storages |
| `coolify_create_application_storage` | [WRITE] Create storage (`type`: persistent\|file) |
| `coolify_update_application_storage` | [WRITE] Update storage (body: uuid + type) |
| `coolify_delete_application_storage` | [DESTRUCTIVE] Delete application storage |
| `coolify_list_database_storages` | List database storages |
| `coolify_create_database_storage` | [WRITE] Create database storage |
| `coolify_update_database_storage` | [WRITE] Update database storage |
| `coolify_delete_database_storage` | [DESTRUCTIVE] Delete database storage |
| `coolify_list_service_storages` | List service storages |
| `coolify_create_service_storage` | [WRITE] Create service storage (`resource_uuid` required) |
| `coolify_update_service_storage` | [WRITE] Update service storage |
| `coolify_delete_service_storage` | [DESTRUCTIVE] Delete service storage |

### Volume Backups (9)

| Tool | Description |
|------|-------------|
| `coolify_set_application_storage_backup` | [WRITE] Create/replace application volume backup schedule |
| `coolify_run_application_storage_backup` | [WRITE] Run on-demand application volume backup |
| `coolify_delete_application_storage_backup` | [DESTRUCTIVE] Delete application volume backup schedule |
| `coolify_set_database_storage_backup` | [WRITE] Create/replace database volume backup schedule |
| `coolify_run_database_storage_backup` | [WRITE] Run on-demand database volume backup |
| `coolify_delete_database_storage_backup` | [DESTRUCTIVE] Delete database volume backup schedule |
| `coolify_set_service_storage_backup` | [WRITE] Create/replace service volume backup schedule |
| `coolify_run_service_storage_backup` | [WRITE] Run on-demand service volume backup |
| `coolify_delete_service_storage_backup` | [DESTRUCTIVE] Delete service volume backup schedule |

### Scheduled Tasks (10)

| Tool | Description |
|------|-------------|
| `coolify_list_application_scheduled_tasks` | List application tasks |
| `coolify_create_application_scheduled_task` | [WRITE] Create an application task |
| `coolify_update_application_scheduled_task` | [WRITE] Update an application task |
| `coolify_delete_application_scheduled_task` | [DESTRUCTIVE] Delete an application task |
| `coolify_list_application_scheduled_task_executions` | List application task executions |
| `coolify_list_service_scheduled_tasks` | List service tasks |
| `coolify_create_service_scheduled_task` | [WRITE] Create a service task |
| `coolify_update_service_scheduled_task` | [WRITE] Update a service task |
| `coolify_delete_service_scheduled_task` | [DESTRUCTIVE] Delete a service task |
| `coolify_list_service_scheduled_task_executions` | List service task executions |

### GitHub Apps (6)

| Tool | Description |
|------|-------------|
| `coolify_list_github_apps` | List GitHub integrations |
| `coolify_create_github_app` | [WRITE] Create an integration |
| `coolify_update_github_app` | [WRITE] Update an integration |
| `coolify_delete_github_app` | [DESTRUCTIVE] Delete an integration |
| `coolify_list_github_app_repositories` | List accessible repositories |
| `coolify_list_github_app_branches` | List repository branches |

### Logs (3)

| Tool | Description |
|------|-------------|
| `coolify_get_logs` | Get application logs with filtering |
| `coolify_get_database_logs` | Get database logs with filtering |
| `coolify_get_service_logs` | Get service logs with filtering |

### System (3)

| Tool | Description |
|------|-------------|
| `coolify_get_version` | Get Coolify instance version |
| `coolify_healthcheck` | Check if Coolify is healthy |
| `coolify_list_resources` | List resources across projects |

### Audit Log (1)

Coolify v4.4+. Requires a team admin/owner API token.

| Tool | Description |
|------|-------------|
| `coolify_list_audit_events` | List UI, API, MCP and webhook activity, newest first (`search`, `action`, `source`, `page`, `per_page`) |

### Secret Managers (2)

Coolify v4.4+. After linking, reference secrets in environment variables as `{{vault.KEY}}`.

| Tool | Description |
|------|-------------|
| `coolify_create_integration_token` | [WRITE] Store a Doppler, Infisical, or HashiCorp Vault token for the team |
| `coolify_update_application_secret_manager` | [WRITE] Link an application to a secret manager token |

### Instance Email Settings (2)

Verified on Coolify v4.3.23. Requires a root-team admin/owner API token. Reading secret values requires `read:sensitive` or `root`; updating requires `write:sensitive`.

| Tool | Description |
|------|-------------|
| `coolify_get_instance_email_settings` | Read instance-wide SMTP and Resend settings |
| `coolify_update_instance_email_settings` | [WRITE] Update SMTP/Resend settings; `null` clears nullable fields |

### Teams (5)

| Tool | Description |
|------|-------------|
| `coolify_list_teams` | List all teams |
| `coolify_get_current_team` | Get token team (`GET /team`) |
| `coolify_update_current_team` | [WRITE] Set the build server fallback of the token team (v4.4+) |
| `coolify_get_current_team_members` | List token team members (`GET /team/members`) |
| `coolify_get_team_members` | List members of a team by ID |

## Available Resources

| URI | Description |
|-----|-------------|
| `coolify://applications` | List of all applications |
| `coolify://databases` | List of all databases |
| `coolify://services` | List of all services |
| `coolify://servers` | List of all servers |
| `coolify://deployments` | List of all deployments |
| `coolify://projects` | List of all projects |
| `coolify://private-keys` | List of all SSH private keys |

## Available Prompts

| Prompt | Description |
|--------|-------------|
| `troubleshoot_deployment` | Step-by-step guide to debug a failed deployment |
| `infrastructure_overview` | Get a complete overview of all infrastructure |
| `deploy_application` | Guided workflow to deploy an application |
| `setup_new_application` | Guided workflow to create and configure a new app |

## Safety Modes

| Variable | Description |
|----------|-------------|
| `COOLIFY_READONLY=true` | Only read operations available (list, get, logs) |
| `COOLIFY_REQUIRE_CONFIRM=true` | Destructive operations require `confirm: true` |

## Log Filtering

The `coolify_get_logs`, `coolify_get_application_preview_logs`, `coolify_get_database_logs`, and `coolify_get_service_logs` tools support:

- `level`: Minimum log level (debug, info, warn, error, fatal)
- `since`/`until`: ISO 8601 timestamps for time range
- `search`: Case-insensitive text search
- `lines`: Server lines to fetch (defaults to `limit`, up to 10000; `"all"` or `-1` fetches all)
- `show_timestamps`: Include server timestamps (default true)
- `limit`: Max filtered entries returned (default 100, max 1000)
- `tail`: Get most recent logs
- `service_name` (application and preview logs, v4.4+): Compose service whose container to read

Coolify v4.4+ only serves logs to tokens with the `read:sensitive` ability.

## API Compatibility Notes for 4.2.0

- **Logs need `read:sensitive` on Coolify v4.4+.** A token with only `read` gets `403` from every log tool. Create a new token with `read:sensitive`, or `root`.
- `instant_deploy` on application, database and service creation, and on application updates, needs the `deploy` ability on Coolify v4.4+.
- Servers have a `server_role` (`deployment`, `build`, `both`). `is_build_server` still works but is deprecated; sending both with different meanings fails before the request.
- Scheduled task `timeout` is limited to 1-36000 seconds, as Coolify v4.4 validates it.
- Database start and restart answer `409` while another start, restart or import runs.
- The multipart upload endpoint for imports (`POST .../imports/uploads`, up to 10 GiB) is not wrapped. Use `source: "s3"` or `source: "server"`, or upload the file yourself and pass its `upload_id`.

## API Compatibility Notes for 4.1.0

- Storage creation/update no longer accepts `host_path`. Calls supplying it receive a migration error before contacting Coolify. Use a named `type: "persistent"` volume, or create `type: "file"` with `fs_path` and either `is_directory: true` or `is_host_file: true`. Existing mount sources cannot be changed through the update endpoint.
- `coolify_create_database_backup` now requires `frequency` and creates a schedule; set `backup_now: true` to also execute it immediately. The result includes the schedule UUID. Create/update support retention, S3 (`s3_storage_uuid`), timeout, and `missing_backup_notification_days` (0 disables alerts). The unsupported update fields `s3_storage_id` and `database_name_prefix` have been removed.
- Preview-domain updates replace the entire domain configuration. Supply exactly one of `domains` (regular app; `null` clears it) or `docker_compose_domains` (Compose app; `[]` clears it).

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `COOLIFY_API_URL` | Yes | Coolify API URL (e.g. `http://your-server:8000/api/v1`) |
| `COOLIFY_TOKEN` | Yes | Bearer token from Coolify dashboard |
| `COOLIFY_TIMEOUT` | No | Request timeout in ms (default: 30000) |
| `COOLIFY_READONLY` | No | Read-only mode (default: false) |
| `COOLIFY_REQUIRE_CONFIRM` | No | Require confirmation for destructive ops (default: false) |
| `DEBUG` | No | Enable debug logging (default: false) |

## Development

```bash
pnpm install             # Install dependencies
pnpm run dev             # Watch mode
pnpm run inspect         # MCP Inspector
pnpm run check           # Lint + typecheck + test
pnpm test                # Run tests only
```

## License

MIT
