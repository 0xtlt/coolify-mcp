#!/usr/bin/env bun
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CoolifyClient } from "./client";
import { loadConfig } from "./config";
import { registerPrompts } from "./prompts";
import { registerResources } from "./resources";
import { registerApplicationTools } from "./tools/applications";
import { registerDatabaseEnvTools } from "./tools/database-envs";
import { registerDatabaseTools } from "./tools/databases";
import { registerDeploymentTools } from "./tools/deployments";
import { registerEnvTools } from "./tools/envs";
import { registerExecuteTools } from "./tools/execute";
import { registerLogTools } from "./tools/logs";
import { registerPrivateKeyTools } from "./tools/private-keys";
import { registerProjectTools } from "./tools/projects";
import { registerServerTools } from "./tools/servers";
import { registerServiceEnvTools } from "./tools/service-envs";
import { registerServiceTools } from "./tools/services";
import { registerSystemTools } from "./tools/system";
import { registerTeamTools } from "./tools/teams";

async function main() {
	const config = loadConfig();
	const client = new CoolifyClient(config);

	const server = new McpServer(
		{
			name: "coolify-mcp",
			version: "2.2.0",
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
6. **Server overview**: list_servers → get_server → validate / get_resources / get_domains
7. **Environment variables**: list_envs → create_env / update_envs_bulk / delete_env
8. **Projects & Environments**: list_projects → get_project → list_environments → get_environment
9. **Update application**: get_application → update_application (modify fields)
10. **Cancel deployment**: list_deployments (status=in_progress) → cancel_deployment
11. **Create application**: list_servers → list_projects → create_application (source_type + params)
12. **Create database**: list_servers → list_projects → create_database (type + params)
13. **Create service**: list_servers → list_projects → create_service (type + params)
14. **Teams**: list_teams → get_current_team → get_team_members
15. **System info**: get_version / healthcheck
16. **Private keys**: list_private_keys → get_private_key → create/update/delete_private_key
17. **Server CRUD**: list_servers → create_server / update_server / delete_server
18. **Environments**: list_environments → create_environment / delete_environment
19. **Service env vars**: list_service_envs → create_service_env / update_service_envs_bulk / delete_service_env
20. **Database env vars**: list_database_envs → create_database_env / update_database_envs_bulk / delete_database_env
21. **Database/service logs**: get_database_logs / get_service_logs (same filters as get_logs)
22. **Execute command**: execute_command_application / execute_command_server (run shell commands)
23. **Backup management**: list_database_backups → create_database_backup / delete_database_backup / restore_database_backup`,
		},
	);

	// Register all tools (config controls which tools are available based on safety mode)
	registerApplicationTools(server, client, config);
	registerDatabaseTools(server, client, config);
	registerDatabaseEnvTools(server, client, config);
	registerDeploymentTools(server, client, config);
	registerEnvTools(server, client, config);
	registerExecuteTools(server, client, config);
	registerLogTools(server, client, config);
	registerProjectTools(server, client, config);
	registerPrivateKeyTools(server, client, config);
	registerServerTools(server, client, config);
	registerServiceTools(server, client, config);
	registerServiceEnvTools(server, client, config);
	registerSystemTools(server, client, config);
	registerTeamTools(server, client, config);

	// Register resources
	registerResources(server, client);

	// Register prompts
	registerPrompts(server);

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
