# coolify-mcp

MCP server for managing Coolify instances. Control applications, databases, services, servers, and more directly from Claude or any MCP-compatible client.

**75 tools | 7 resources | 4 prompts**

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
cd coolify-mcp && bun install
COOLIFY_API_URL=... COOLIFY_TOKEN=... bun run src/index.ts
```

### Claude Desktop

Add to `~/.claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "coolify": {
      "command": "bun",
      "args": ["run", "/path/to/coolify-mcp/src/index.ts"],
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
| `coolify_validate_server` | Check SSH connectivity and Docker |
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

### Deployments (4)

| Tool | Description |
|------|-------------|
| `coolify_list_deployments` | List deployments |
| `coolify_get_deployment` | Get deployment details |
| `coolify_trigger_deploy` | [WRITE] Trigger a deployment |
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

### Logs (3)

| Tool | Description |
|------|-------------|
| `coolify_get_logs` | Get application logs with filtering |
| `coolify_get_database_logs` | Get database logs with filtering |
| `coolify_get_service_logs` | Get service logs with filtering |

### Execute Command (2)

| Tool | Description |
|------|-------------|
| `coolify_execute_command_application` | [WRITE] Execute command in application container |
| `coolify_execute_command_server` | [WRITE] Execute command on server via SSH |

### System (2)

| Tool | Description |
|------|-------------|
| `coolify_get_version` | Get Coolify instance version |
| `coolify_healthcheck` | Check if Coolify is healthy |

### Teams (3)

| Tool | Description |
|------|-------------|
| `coolify_list_teams` | List all teams |
| `coolify_get_current_team` | Get current authenticated team |
| `coolify_get_team_members` | List members of a team |

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
bun install              # Install dependencies
bun run dev              # Watch mode
bun run inspect          # MCP Inspector
bun run check            # Lint + typecheck + test
bun test                 # Run tests only
```

## License

MIT
