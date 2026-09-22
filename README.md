# coolify-mcp

MCP server for managing Coolify instances (**v4.3.23 API**). Control applications, databases, services, servers, and more directly from Claude or any MCP-compatible client.

**213 tools | 7 resources | 4 prompts**

Requires Coolify **v4.3.0** or newer (`/api/v1`). Instance email settings and preview log/update routes need **v4.3.23**. Legacy GET-based state-changing endpoints are not supported.

## Installation

### Claude Code

```bash
claude mcp add coolify \
  -e COOLIFY_API_URL=http://your-server:8000/api/v1 \
  -e COOLIFY_TOKEN=your-token \
  -- npx coolify-mcp
```

### Codex

```bash
codex mcp add coolify \
  --env COOLIFY_API_URL=http://your-server:8000/api/v1 \
  --env COOLIFY_TOKEN=your-token \
  -- npx coolify-mcp
```

### Other MCP clients

```bash
COOLIFY_API_URL=http://your-server:8000/api/v1 \
COOLIFY_TOKEN=your-token \
npx coolify-mcp
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

### Databases (11)

| Tool | Description |
|------|-------------|
| `coolify_list_databases` | List all databases (summary) |
| `coolify_get_database` | Get database details |
| `coolify_create_database` | [WRITE] Create PostgreSQL, MySQL, MariaDB, MongoDB, Redis, etc. |
| `coolify_update_database` | [WRITE] Update database config |
| `coolify_list_database_backups` | List backups for a database |
| `coolify_create_database_backup` | [WRITE] Create a database backup |
| `coolify_delete_database_backup` | [DESTRUCTIVE] Delete a scheduled backup config |
| `coolify_start_database` | [WRITE] Start a stopped database |
| `coolify_stop_database` | [DESTRUCTIVE] Stop a database |
| `coolify_restart_database` | [DESTRUCTIVE] Restart a database |
| `coolify_delete_database` | [DESTRUCTIVE] Delete a database |

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
| `coolify_delete_server` | [DESTRUCTIVE] Delete a server |

### Private Keys (5)

| Tool | Description |
|------|-------------|
| `coolify_list_private_keys` | List all SSH private keys (summary) |
| `coolify_get_private_key` | Get private key details |
| `coolify_create_private_key` | [WRITE] Create a new SSH key |
| `coolify_update_private_key` | [WRITE] Update an SSH key |
| `coolify_delete_private_key` | [DESTRUCTIVE] Delete an SSH key |

### Projects & Environments (10)

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

### Logs (4)

| Tool | Description |
|------|-------------|
| `coolify_get_logs` | Get application logs with filtering |
| `coolify_get_database_logs` | Get database logs with filtering |
| `coolify_get_service_logs` | Get service logs with filtering |
| `coolify_get_preview_logs` | Get preview deployment logs with filtering |

### System (2)

| Tool | Description |
|------|-------------|
| `coolify_get_version` | Get Coolify instance version |
| `coolify_healthcheck` | Check if Coolify is healthy |

### Teams (5)

| Tool | Description |
|------|-------------|
| `coolify_list_teams` | List all teams |
| `coolify_get_current_team` | Get token team (`GET /team`) |
| `coolify_get_current_team_members` | List token team members (`GET /team/members`) |
| `coolify_get_team_members` | List members of a team by ID |
| `coolify_get_team` | Get a team by numeric id (`GET /teams/{id}`) |

### Added in 4.1.0 (Coolify v4.3.23)

| Tool | Description |
|------|-------------|
| `coolify_list_tags` / `coolify_create_tag` / `coolify_update_tag` / `coolify_delete_tag` | Team tag CRUD |
| `coolify_list_resource_tags` / `coolify_add_resource_tags` / `coolify_remove_resource_tag` | Tags on an application, database, or service |
| `coolify_list_destinations` / `coolify_get_destination` / `coolify_create_destination` / `coolify_update_destination` / `coolify_delete_destination` | Docker network destinations |
| `coolify_list_server_destinations` | Destinations on a server |
| `coolify_list_application_destinations` / `coolify_add_application_destination` / `coolify_remove_application_destination` | Extra application destinations |
| `coolify_move_resource` | Move an application, database, or service to another environment |
| `coolify_clone_resource` | Clone an application, database, or service onto a destination |
| `coolify_migrate_resource` | [DESTRUCTIVE] Migrate to another destination. Coolify returns 404 unless the instance is in dev mode |
| `coolify_list_rollback_images` / `coolify_rollback_application` | List image tags and roll an application back |
| `coolify_update_preview` / `coolify_delete_preview` / `coolify_get_preview_logs` | Preview deployment domains, deletion, and logs |
| `coolify_update_environment` | Rename an environment or change its description |
| `coolify_list_shared_envs` / `coolify_create_shared_env` / `coolify_update_shared_env` / `coolify_delete_shared_env` | Shared envs for team, project, environment, or server |
| `coolify_get_notification_settings` / `coolify_update_notification_settings` | Team email, Discord, Slack, Telegram, Pushover, or webhook settings |
| `coolify_get_instance_email_settings` / `coolify_update_instance_email_settings` | Instance SMTP and Resend settings (`/settings/email`, root team; update needs `write:sensitive`) |
| `coolify_list_s3_storages` / `coolify_get_s3_storage` / `coolify_create_s3_storage` / `coolify_update_s3_storage` / `coolify_delete_s3_storage` / `coolify_validate_s3_storage` | S3-compatible storages |
| `coolify_list_cloud_tokens` / `coolify_get_cloud_token` / `coolify_create_cloud_token` / `coolify_update_cloud_token` / `coolify_delete_cloud_token` / `coolify_validate_cloud_token` | Hetzner, Vultr, and DigitalOcean tokens |
| `coolify_list_cloud_init_scripts` / `coolify_get_cloud_init_script` / `coolify_create_cloud_init_script` / `coolify_update_cloud_init_script` / `coolify_delete_cloud_init_script` | Cloud-init scripts |
| `coolify_list_cloud_provider_options` | Provider catalog (regions, images, plans, SSH keys, firewalls, networks) |
| `coolify_create_hetzner_server` / `coolify_create_vultr_server` / `coolify_create_digitalocean_server` | [WRITE] Create a cloud server and register it in Coolify |
| `coolify_get_docker_cleanup` / `coolify_update_docker_cleanup` / `coolify_run_docker_cleanup` / `coolify_list_docker_cleanup_executions` | Server Docker cleanup |
| `coolify_get_log_drains` / `coolify_update_log_drains` | New Relic, Axiom, and custom log drains |
| `coolify_get_sentinel` / `coolify_update_sentinel` | Sentinel metrics settings |
| `coolify_get_cloudflare_tunnel` / `coolify_update_cloudflare_tunnel` / `coolify_enable_cloudflare_tunnel` / `coolify_disable_cloudflare_tunnel` | Cloudflare Tunnel |
| `coolify_get_server_proxy` / `coolify_update_server_proxy` / `coolify_save_server_proxy_configuration` / `coolify_restart_server_proxy` | Proxy settings, configuration, and restart |
| `coolify_list_gitlab_apps` / `coolify_create_gitlab_app` / `coolify_update_gitlab_app` / `coolify_delete_gitlab_app` | GitLab App integrations |
| `coolify_list_service_applications` / `coolify_get_service_application` / `coolify_update_service_application` / `coolify_get_service_application_logs` / `coolify_start_service_application` / `coolify_restart_service_application` / `coolify_stop_service_application` | Compose applications inside a service |
| `coolify_list_service_databases` / `coolify_get_service_database` / `coolify_update_service_database` / `coolify_get_service_database_logs` / `coolify_start_service_database` / `coolify_restart_service_database` / `coolify_stop_service_database` | Compose databases inside a service |
| `coolify_execute_application_scheduled_task` / `coolify_execute_service_scheduled_task` | Queue a scheduled task immediately |
| `coolify_export_server` / `coolify_import_server` / `coolify_transfer_server` / `coolify_claim_server` / `coolify_complete_server_transfer` / `coolify_write_server_transfer_mailbox` | Move a server between Coolify instances. Export, transfer, and mailbox write need `read:sensitive` |

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

The `coolify_get_logs`, `coolify_get_database_logs`, and `coolify_get_service_logs` tools support:

- `level`: Minimum log level (debug, info, warn, error, fatal)
- `since`/`until`: ISO 8601 timestamps for time range
- `search`: Case-insensitive text search
- `limit`: Max entries (default 100)
- `tail`: Get most recent logs

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
