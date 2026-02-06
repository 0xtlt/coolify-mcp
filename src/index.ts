#!/usr/bin/env bun
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CoolifyClient } from "./client";
import { loadConfig } from "./config";
import { registerResources } from "./resources";
import { registerApplicationTools } from "./tools/applications";
import { registerDatabaseTools } from "./tools/databases";
import { registerDeploymentTools } from "./tools/deployments";
import { registerEnvTools } from "./tools/envs";
import { registerLogTools } from "./tools/logs";
import { registerServerTools } from "./tools/servers";
import { registerServiceTools } from "./tools/services";

async function main() {
	const config = loadConfig();
	const client = new CoolifyClient(config);

	const server = new McpServer(
		{
			name: "coolify-mcp",
			version: "1.2.0",
		},
		{
			instructions: `Coolify MCP server for managing self-hosted PaaS instances.

## Safety Modes
- **COOLIFY_READONLY=true**: Only read operations are available (list, get, logs)
- **COOLIFY_REQUIRE_CONFIRM=true**: Destructive operations (stop, restart, delete) require confirm: true parameter

## Response Format
- List operations return **summaries** (uuid, name, status) for token efficiency
- Get operations return **full details** with \`_actions\` hints for next steps
- [WRITE] tools modify state (start, deploy)
- [DESTRUCTIVE] tools may cause downtime (stop, restart, delete)

## Common workflows
1. **Check app status**: list_applications → get_application (follow _actions)
2. **Debug failing deploy**: list_deployments (status=failed) → get_logs with search
3. **Restart app**: get_application (verify uuid) → restart_application
4. **Manage databases**: list_databases → get_database → list_database_backups
5. **Manage services**: list_services → get_service (follow _actions for start/stop/restart)
6. **Server overview**: get_server_resources → get_server_domains
7. **Environment variables**: list_envs → create_env / update_envs_bulk / delete_env`,
		},
	);

	// Register all tools (config controls which tools are available based on safety mode)
	registerApplicationTools(server, client, config);
	registerDatabaseTools(server, client, config);
	registerDeploymentTools(server, client, config);
	registerEnvTools(server, client, config);
	registerLogTools(server, client, config);
	registerServerTools(server, client, config);
	registerServiceTools(server, client, config);

	// Register resources
	registerResources(server, client);

	// Start server with stdio transport
	const transport = new StdioServerTransport();
	await server.connect(transport);

	if (config.debug) {
		console.error("[DEBUG] Coolify MCP server started");
		if (config.readonly) console.error("[DEBUG] Read-only mode enabled");
		if (config.requireConfirm)
			console.error("[DEBUG] Confirmation required for destructive operations");
	}
}

main().catch((error) => {
	console.error("Failed to start Coolify MCP server:", error);
	process.exit(1);
});
