import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CoolifyClient } from "../client";
import type { Config } from "../config";
import { definedRecord, registerApiTool } from "../lib/register-tool";
import * as schemas from "../lib/schemas";

export function registerDestinationTools(server: McpServer, client: CoolifyClient, config: Config) {
	registerApiTool(
		server,
		config,
		"coolify_list_destinations",
		"List Docker network destinations for the current team",
		{},
		async () => client.listDestinations(),
	);

	registerApiTool<{ uuid: string }>(
		server,
		config,
		"coolify_get_destination",
		"Get a Docker network destination by UUID",
		{ uuid: schemas.uuid.describe("Destination UUID") },
		async ({ uuid }) => client.getDestination(uuid),
	);

	registerApiTool<{ server_uuid: string }>(
		server,
		config,
		"coolify_list_server_destinations",
		"List destinations on a server",
		{ server_uuid: schemas.uuid.describe("Server UUID") },
		async ({ server_uuid }) => client.listServerDestinations(server_uuid),
	);

	registerApiTool<{
		server_uuid: string;
		network: string;
		name?: string;
		type?: "standalone" | "swarm";
	}>(
		server,
		config,
		"coolify_create_destination",
		"[WRITE] Create a Docker network destination on a server. Network must match the server type (standalone or swarm).",
		{
			server_uuid: schemas.uuid.describe("Server UUID"),
			network: z
				.string()
				.min(1)
				.max(255)
				.describe("Docker network name (letters, numbers, dot, underscore, hyphen)"),
			name: z.string().max(255).optional().describe("Friendly name"),
			type: z.enum(["standalone", "swarm"]).optional().describe("Destination type"),
		},
		async ({ server_uuid, network, name, type }) =>
			client.createDestination(
				server_uuid,
				definedRecord({ network, name, type }) as {
					network: string;
					name?: string;
					type?: "standalone" | "swarm";
				},
			),
	);

	registerApiTool<{ uuid: string; name: string }>(
		server,
		config,
		"coolify_update_destination",
		"[WRITE] Rename a destination",
		{
			uuid: schemas.uuid.describe("Destination UUID"),
			name: z.string().min(1).max(255).describe("New name"),
		},
		async ({ uuid, name }) => client.updateDestination(uuid, name),
	);

	registerApiTool<{ uuid: string; confirm?: boolean }>(
		server,
		config,
		"coolify_delete_destination",
		"[DESTRUCTIVE] Delete a destination that has no attached resources",
		{ uuid: schemas.uuid.describe("Destination UUID"), confirm: schemas.confirm },
		async ({ uuid }) => client.deleteDestination(uuid),
	);

	registerApiTool<{ uuid: string }>(
		server,
		config,
		"coolify_list_application_destinations",
		"List the primary and additional destinations attached to an application",
		{ uuid: schemas.uuid.describe("Application UUID") },
		async ({ uuid }) => client.listApplicationDestinations(uuid),
	);

	registerApiTool<{ uuid: string; destination_uuid: string }>(
		server,
		config,
		"coolify_add_application_destination",
		"[WRITE] Attach an additional standalone Docker destination to an application. It must be on a different server than the primary destination.",
		{
			uuid: schemas.uuid.describe("Application UUID"),
			destination_uuid: schemas.uuid.describe("Destination UUID"),
		},
		async ({ uuid, destination_uuid }) => client.addApplicationDestination(uuid, destination_uuid),
	);

	registerApiTool<{ uuid: string; destination_uuid: string; confirm?: boolean }>(
		server,
		config,
		"coolify_remove_application_destination",
		"[DESTRUCTIVE] Detach an additional destination from an application. The primary destination cannot be removed.",
		{
			uuid: schemas.uuid.describe("Application UUID"),
			destination_uuid: schemas.uuid.describe("Destination UUID"),
			confirm: schemas.confirm,
		},
		async ({ uuid, destination_uuid }) =>
			client.removeApplicationDestination(uuid, destination_uuid),
	);
}
