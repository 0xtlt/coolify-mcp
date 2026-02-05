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

	const server = new McpServer({
		name: "coolify-mcp",
		version: "1.0.0",
	});

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
