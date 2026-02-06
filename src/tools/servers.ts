import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CoolifyClient } from "../client";
import type { Config } from "../config";
import { checkConfirmation, isToolAllowed, readonlyError } from "../lib/safety";
import * as schemas from "../lib/schemas";
import { type ResponseAction, wrap, wrapWithActions } from "../lib/wrap";
import type { ServerInfo } from "../types/api";
import { toServerSummary } from "../types/api";

function getServerActions(uuid: string): ResponseAction[] {
	return [
		{ tool: "coolify_validate_server", args: { uuid }, hint: "Validate" },
		{ tool: "coolify_get_server_resources", args: { uuid }, hint: "View resources" },
		{ tool: "coolify_get_server_domains", args: { uuid }, hint: "View domains" },
		{ tool: "coolify_update_server", args: { uuid }, hint: "Update config" },
		{ tool: "coolify_delete_server", args: { uuid }, hint: "Delete" },
	];
}

export function registerServerTools(server: McpServer, client: CoolifyClient, config: Config) {
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

	// Write: create server
	if (isToolAllowed("coolify_create_server", config)) {
		server.tool(
			"coolify_create_server",
			"[WRITE] Create a new Coolify server (requires SSH private key)",
			{
				name: z.string().min(1).describe("Server display name"),
				ip: z.string().min(1).describe("Server IP address or hostname"),
				private_key_uuid: z.string().min(1).describe("UUID of the SSH private key"),
				user: z.string().default("root").describe("SSH username (default: root)"),
				port: z.number().int().default(22).describe("SSH port (default: 22)"),
				description: z.string().optional().describe("Server description"),
				is_build_server: z.boolean().optional().describe("Use as build server"),
				instant_validate: z.boolean().optional().describe("Validate immediately after creation"),
			},
			async (fields) => {
				if (!isToolAllowed("coolify_create_server", config))
					return readonlyError("coolify_create_server");
				return wrap(async () => {
					const data: Record<string, unknown> = {};
					for (const [k, v] of Object.entries(fields)) {
						if (v !== undefined) data[k] = v;
					}
					const result = await client.createServer(data);
					return { message: "Server created", uuid: result.uuid };
				});
			},
		);
	}

	// Write: update server
	if (isToolAllowed("coolify_update_server", config)) {
		server.tool(
			"coolify_update_server",
			"[WRITE] Update configuration of a Coolify server",
			{
				uuid: schemas.uuid,
				name: z.string().optional().describe("Server display name"),
				description: z.string().optional().describe("Server description"),
				ip: z.string().optional().describe("Server IP address"),
				port: z.number().int().optional().describe("SSH port"),
				user: z.string().optional().describe("SSH username"),
				private_key_uuid: z.string().optional().describe("UUID of the SSH private key"),
				is_build_server: z.boolean().optional().describe("Use as build server"),
			},
			async ({ uuid, ...fields }) => {
				if (!isToolAllowed("coolify_update_server", config))
					return readonlyError("coolify_update_server");
				return wrap(async () => {
					const data: Record<string, unknown> = {};
					for (const [k, v] of Object.entries(fields)) {
						if (v !== undefined) data[k] = v;
					}
					await client.updateServer(uuid, data);
					return `Server ${uuid} updated`;
				});
			},
		);
	}

	// Destructive: delete server
	if (isToolAllowed("coolify_delete_server", config)) {
		server.tool(
			"coolify_delete_server",
			"[DESTRUCTIVE] Permanently delete a server and stop all its resources",
			{
				uuid: schemas.uuid,
				confirm: schemas.confirm,
			},
			async ({ uuid, confirm }) => {
				if (!isToolAllowed("coolify_delete_server", config))
					return readonlyError("coolify_delete_server");
				const check = checkConfirmation("coolify_delete_server", { uuid, confirm }, config);
				if (!check.proceed) return check.response!;
				return wrap(async () => {
					const result = await client.deleteServer(uuid);
					return result.message || `Server ${uuid} deleted`;
				});
			},
		);
	}
}
