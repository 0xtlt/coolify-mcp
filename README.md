# coolify-mcp

MCP server for managing Coolify instances. Control applications, monitor deployments, and retrieve logs directly from Claude or any MCP-compatible client.

## Installation

```bash
bun install
```

## Configuration

Set environment variables (or use `.env` file):

```bash
export COOLIFY_API_URL=http://your-coolify-server:8000/api/v1
export COOLIFY_TOKEN=your-bearer-token
export COOLIFY_TIMEOUT=30000  # optional, default 30s
export DEBUG=false            # optional
```

Get your API token from Coolify dashboard: **Keys & Tokens > API tokens**

## Usage

### With Claude Desktop

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

### Standalone

```bash
bun run start
```

### Development

```bash
bun run dev      # Watch mode
bun run inspect  # MCP Inspector
```

## Available Tools

| Tool | Description |
|------|-------------|
| `coolify_list_applications` | List all applications |
| `coolify_get_application` | Get application details |
| `coolify_start_application` | Start an application |
| `coolify_stop_application` | Stop an application |
| `coolify_restart_application` | Restart an application |
| `coolify_list_deployments` | List deployments (filterable by status) |
| `coolify_get_deployment` | Get deployment details |
| `coolify_trigger_deploy` | Trigger a deployment |
| `coolify_get_logs` | Get logs with filtering |

### Log Filtering

The `coolify_get_logs` tool supports:

- `level`: Minimum log level (debug, info, warn, error, fatal)
- `since`/`until`: ISO 8601 timestamps for time range
- `search`: Case-insensitive text search
- `limit`: Max entries (default 100)
- `tail`: Get most recent logs

## Available Resources

| URI | Description |
|-----|-------------|
| `coolify://applications` | List of all applications |
| `coolify://deployments` | List of all deployments |
| `coolify://servers` | List of all servers |

## Scripts

```bash
bun run check     # Lint + format + typecheck
bun run lint      # Lint only
bun run format    # Format only
bun run typecheck # TypeScript check
```

## License

MIT
