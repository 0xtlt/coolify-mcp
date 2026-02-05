# coolify-mcp

MCP server for managing Coolify instances. Control applications, monitor deployments, and retrieve logs directly from Claude or any MCP-compatible client.

## Usage

### With Claude Code CLI

Add to your project:

```bash
claude mcp add coolify -s project \
  -e COOLIFY_API_URL=http://your-server:8000/api/v1 \
  -e COOLIFY_TOKEN=your-token \
  -- bun run /path/to/coolify-mcp/src/index.ts
```

Or add globally (all projects):

```bash
claude mcp add coolify -s user \
  -e COOLIFY_API_URL=http://your-server:8000/api/v1 \
  -e COOLIFY_TOKEN=your-token \
  -- bun run /path/to/coolify-mcp/src/index.ts
```

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

### Get your API token

Coolify dashboard: **Keys & Tokens > API tokens**

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

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `COOLIFY_API_URL` | Yes | Coolify API URL (e.g. `http://your-server:8000/api/v1`) |
| `COOLIFY_TOKEN` | Yes | Bearer token from Coolify dashboard |
| `COOLIFY_TIMEOUT` | No | Request timeout in ms (default: 30000) |
| `DEBUG` | No | Enable debug logging (default: false) |

## Development

```bash
bun install              # Install dependencies
bun run dev              # Watch mode
bun run inspect          # MCP Inspector
bun run check            # Lint + format + typecheck
```

## License

MIT
