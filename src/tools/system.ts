import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CoolifyClient } from "../client";
import type { Config } from "../config";
import { wrap } from "../lib/wrap";

export function registerSystemTools(server: McpServer, client: CoolifyClient, _config: Config) {
	server.tool("coolify_get_version", "Get the Coolify instance version", {}, async () => {
		return wrap(() => client.getVersion());
	});

	server.tool(
		"coolify_healthcheck",
		"Check if the Coolify instance is healthy and reachable",
		{},
		async () => {
			return wrap(() => client.healthcheck());
		},
	);
}
