import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CoolifyClient } from "../client";
import type { Config } from "../config";
import * as schemas from "../lib/schemas";
import { wrap } from "../lib/wrap";

export function registerServerTools(server: McpServer, client: CoolifyClient, _config: Config) {
	server.tool(
		"coolify_validate_server",
		"Validate a Coolify server (checks SSH connectivity and Docker prerequisites)",
		{ uuid: schemas.uuid.describe("UUID of the server to validate") },
		async ({ uuid }) => {
			return wrap(() => client.validateServer(uuid));
		},
	);

	server.tool(
		"coolify_get_server_resources",
		"List all resources (applications, databases, services) deployed on a server",
		{ uuid: schemas.uuid.describe("UUID of the server") },
		async ({ uuid }) => {
			return wrap(() => client.getServerResources(uuid));
		},
	);

	server.tool(
		"coolify_get_server_domains",
		"List all domains configured on a server with their resource mappings",
		{ uuid: schemas.uuid.describe("UUID of the server") },
		async ({ uuid }) => {
			return wrap(() => client.getServerDomains(uuid));
		},
	);
}
