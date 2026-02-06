import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CoolifyClient } from "../client";
import type { Config } from "../config";
import { checkConfirmation, isToolAllowed, readonlyError } from "../lib/safety";
import * as schemas from "../lib/schemas";
import { type ResponseAction, wrap, wrapWithActions } from "../lib/wrap";
import type { PrivateKey } from "../types/api";
import { toPrivateKeySummary } from "../types/api";

function getPrivateKeyActions(uuid: string): ResponseAction[] {
	return [
		{ tool: "coolify_update_private_key", args: { uuid }, hint: "Update" },
		{ tool: "coolify_delete_private_key", args: { uuid }, hint: "Delete" },
	];
}

export function registerPrivateKeyTools(server: McpServer, client: CoolifyClient, config: Config) {
	server.tool(
		"coolify_list_private_keys",
		"List all SSH private keys (returns summary: uuid, name, description, fingerprint)",
		{},
		async () => {
			return wrap(async () => {
				const keys = await client.listPrivateKeys();
				return keys.map(toPrivateKeySummary);
			});
		},
	);

	server.tool(
		"coolify_get_private_key",
		"Get detailed information about a specific SSH private key",
		{ uuid: schemas.uuid },
		async ({ uuid }) => {
			return wrapWithActions(
				() => client.getPrivateKey(uuid),
				(_key: PrivateKey) => getPrivateKeyActions(uuid),
			);
		},
	);

	// Write: create
	if (isToolAllowed("coolify_create_private_key", config)) {
		server.tool(
			"coolify_create_private_key",
			"[WRITE] Create a new SSH private key for server/application authentication",
			{
				name: z.string().min(1).describe("Name for the private key"),
				description: z.string().optional().describe("Description of the key"),
				private_key: z.string().min(1).describe("PEM-formatted private key content"),
			},
			async ({ name, description, private_key }) => {
				if (!isToolAllowed("coolify_create_private_key", config))
					return readonlyError("coolify_create_private_key");
				return wrap(async () => {
					const result = await client.createPrivateKey({ name, description, private_key });
					return { message: "Private key created", uuid: result.uuid };
				});
			},
		);
	}

	// Write: update
	if (isToolAllowed("coolify_update_private_key", config)) {
		server.tool(
			"coolify_update_private_key",
			"[WRITE] Update an existing SSH private key",
			{
				uuid: schemas.uuid,
				name: z.string().optional().describe("Key name"),
				description: z.string().optional().describe("Key description"),
				private_key: z.string().optional().describe("New PEM-formatted private key content"),
			},
			async ({ uuid, ...fields }) => {
				if (!isToolAllowed("coolify_update_private_key", config))
					return readonlyError("coolify_update_private_key");
				return wrap(async () => {
					const data: Record<string, unknown> = {};
					for (const [k, v] of Object.entries(fields)) {
						if (v !== undefined) data[k] = v;
					}
					await client.updatePrivateKey(uuid, data);
					return `Private key ${uuid} updated`;
				});
			},
		);
	}

	// Destructive: delete
	if (isToolAllowed("coolify_delete_private_key", config)) {
		server.tool(
			"coolify_delete_private_key",
			"[DESTRUCTIVE] Delete an SSH private key. Blocked if in use by any server or application.",
			{
				uuid: schemas.uuid,
				confirm: schemas.confirm,
			},
			async ({ uuid, confirm }) => {
				if (!isToolAllowed("coolify_delete_private_key", config))
					return readonlyError("coolify_delete_private_key");
				const check = checkConfirmation("coolify_delete_private_key", { uuid, confirm }, config);
				if (!check.proceed) return check.response!;
				return wrap(async () => {
					const result = await client.deletePrivateKey(uuid);
					return result.message || `Private key ${uuid} deleted`;
				});
			},
		);
	}
}
