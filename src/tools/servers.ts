import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CoolifyClient } from "../client";
import type { Config } from "../config";
import { checkConfirmation, isToolAllowed, readonlyError } from "../lib/safety";
import * as schemas from "../lib/schemas";
import { type ResponseAction, wrap, wrapWithActions } from "../lib/wrap";
import type { ServerInfo } from "../types/api";
import { toServerSummary } from "../types/api";

// Coolify v4.4 answers 422 when the deprecated flag disagrees with server_role.
function assertServerRole(fields: { server_role?: string; is_build_server?: boolean }): void {
	if (fields.server_role === undefined || fields.is_build_server === undefined) return;
	if (fields.is_build_server !== (fields.server_role === "build")) {
		throw new Error(
			"is_build_server is deprecated and conflicts with server_role. Send only server_role.",
		);
	}
}

function getServerActions(uuid: string): ResponseAction[] {
	return [
		{ tool: "coolify_validate_server", args: { uuid }, hint: "Validate" },
		{ tool: "coolify_get_server_resources", args: { uuid }, hint: "View resources" },
		{ tool: "coolify_get_server_domains", args: { uuid }, hint: "View domains" },
		{ tool: "coolify_list_server_registries", args: { uuid }, hint: "View registry logins" },
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

	if (isToolAllowed("coolify_validate_server", config)) {
		server.tool(
			"coolify_validate_server",
			"[WRITE] Validate a Coolify server (SSH connectivity and Docker prerequisites). Requires POST on Coolify v4.2+.",
			{
				uuid: schemas.uuid.describe("UUID of the server to validate"),
				install: z
					.boolean()
					.optional()
					.describe("Install missing prerequisites and Docker (may restart Docker)"),
			},
			async ({ uuid, install }) => {
				if (!isToolAllowed("coolify_validate_server", config))
					return readonlyError("coolify_validate_server");
				return wrap(() => client.validateServer(uuid, { install }));
			},
		);
	}

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
				server_role: z
					.enum(["deployment", "build", "both"])
					.optional()
					.describe(
						"Deployments only, builds only, or both (Coolify v4.4+; replaces is_build_server)",
					),
				is_build_server: z
					.boolean()
					.optional()
					.describe("Use as build server (Coolify v4.4+: deprecated, use server_role=build)"),
				instant_validate: z.boolean().optional().describe("Validate immediately after creation"),
			},
			async (fields) => {
				if (!isToolAllowed("coolify_create_server", config))
					return readonlyError("coolify_create_server");
				return wrap(async () => {
					assertServerRole(fields);
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
				server_role: z
					.enum(["deployment", "build", "both"])
					.optional()
					.describe(
						"Deployments only, builds only, or both (Coolify v4.4+; replaces is_build_server)",
					),
				is_build_server: z
					.boolean()
					.optional()
					.describe("Use as build server (Coolify v4.4+: deprecated, use server_role=build)"),
				server_disk_usage_notification_interval_hours: z
					.number()
					.int()
					.min(1)
					.max(720)
					.optional()
					.describe("Hours between repeated high disk usage alerts (Coolify v4.4+)"),
			},
			async ({ uuid, ...fields }) => {
				if (!isToolAllowed("coolify_update_server", config))
					return readonlyError("coolify_update_server");
				return wrap(async () => {
					assertServerRole(fields);
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
				force: z.boolean().optional().describe("Force delete even if server has running resources"),
				delete_from_provider: z
					.boolean()
					.optional()
					.describe(
						"Also delete the machine at Hetzner, Vultr, or DigitalOcean (Coolify v4.4+; needs a cloud token of the team)",
					),
			},
			async ({ uuid, confirm, force, delete_from_provider }) => {
				if (!isToolAllowed("coolify_delete_server", config))
					return readonlyError("coolify_delete_server");
				const check = checkConfirmation(
					"coolify_delete_server",
					{ uuid, ...(delete_from_provider !== undefined && { delete_from_provider }), confirm },
					config,
				);
				if (!check.proceed) return check.response!;
				return wrap(async () => {
					const result = await client.deleteServer(uuid, { force, delete_from_provider });
					return result.message || `Server ${uuid} deleted`;
				});
			},
		);
	}
}
