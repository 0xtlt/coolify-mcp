import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CoolifyClient } from "../client";
import type { Config } from "../config";
import * as schemas from "../lib/schemas";
import { type ResponseAction, wrap, wrapWithActions } from "../lib/wrap";
import type { ServerInfo } from "../types/api";
import { toServerSummary } from "../types/api";

function getServerActions(uuid: string): ResponseAction[] {
	return [
		{ tool: "coolify_validate_server", args: { uuid }, hint: "Validate" },
		{ tool: "coolify_get_server_resources", args: { uuid }, hint: "View resources" },
		{ tool: "coolify_get_server_domains", args: { uuid }, hint: "View domains" },
	];
}

export function registerServerTools(server: McpServer, client: CoolifyClient, _config: Config) {
	server.tool(
		"coolify_list_servers",
		"List all servers managed by Coolify (returns summary: uuid, name, ip)",
		{},
		async () => {
			return wrap(async () => {
				const servers = await client.listServers();
				return servers.map(toServerSummary);
			});
		},
	);

	server.tool(
		"coolify_get_server",
		"Get detailed information about a specific Coolify server",
		{ uuid: schemas.uuid },
		async ({ uuid }) => {
			return wrapWithActions(
				() => client.getServer(uuid),
				(_srv: ServerInfo) => getServerActions(uuid),
			);
		},
	);

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
