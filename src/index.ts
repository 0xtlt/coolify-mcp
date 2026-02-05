#!/usr/bin/env bun
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CoolifyClient } from "./client";
import { loadConfig } from "./config";
import { registerResources } from "./resources";
import { registerApplicationTools } from "./tools/applications";
import { registerDeploymentTools } from "./tools/deployments";
import { registerLogTools } from "./tools/logs";

async function main() {
	const config = loadConfig();
	const client = new CoolifyClient(config);

	const server = new McpServer(
		{
			name: "coolify-mcp",
			version: "1.0.0",
		},
		{
			instructions: `Coolify MCP server for managing self-hosted PaaS instances.

## Usage Tips
- **Large responses**: List operations return full API data which can be large (100k+ chars). When saved to file, use jq to extract relevant fields:
  \`cat response.json | jq '.[] | {uuid, name, status, fqdn}'\`
- **UUIDs**: Most operations require application/deployment UUIDs. Get them from list operations first.
- **Logs filtering**: Use level, search, since/until params to reduce log volume.

## Common workflows
1. **Check app status**: list_applications → jq filter by name → get status
2. **Debug failing deploy**: list_deployments (status=failed) → get_logs with search
3. **Restart app**: get_application (verify uuid) → restart_application`,
		},
	);

	// Register all tools
	registerApplicationTools(server, client);
	registerDeploymentTools(server, client);
	registerLogTools(server, client);

	// Register resources
	registerResources(server, client);

	// Start server with stdio transport
	const transport = new StdioServerTransport();
	await server.connect(transport);

	if (config.debug) {
		console.error("[DEBUG] Coolify MCP server started");
	}
}

main().catch((error) => {
	console.error("Failed to start Coolify MCP server:", error);
	process.exit(1);
});
