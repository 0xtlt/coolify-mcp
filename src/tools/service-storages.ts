import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CoolifyClient } from "../client";
import type { Config } from "../config";
import { checkConfirmation, isToolAllowed, readonlyError } from "../lib/safety";
import * as schemas from "../lib/schemas";
import { wrap } from "../lib/wrap";
import { toStorageSummary } from "../types/api";

export function registerServiceStorageTools(
	server: McpServer,
	client: CoolifyClient,
	config: Config,
) {
	server.tool(
		"coolify_list_service_storages",
		"List all persistent storage mounts for a Coolify service",
		{ uuid: schemas.uuid.describe("UUID of the service") },
		async ({ uuid }) => {
			return wrap(async () => {
				const storages = await client.listServiceStorages(uuid);
				return storages.map(toStorageSummary);
			});
		},
	);

	if (isToolAllowed("coolify_create_service_storage", config)) {
		server.tool(
			"coolify_create_service_storage",
			"[WRITE] Add a persistent storage mount to a Coolify service",
			{
				uuid: schemas.uuid.describe("UUID of the service"),
				name: z.string().min(1).describe("Storage name"),
				mount_path: z.string().min(1).describe("Container mount path (e.g. /data)"),
				host_path: z.string().optional().describe("Host path (leave empty for Docker volume)"),
				content: z.string().optional().describe("File content (for config file mounts)"),
			},
			async ({ uuid, name, mount_path, host_path, content }) => {
				if (!isToolAllowed("coolify_create_service_storage", config))
					return readonlyError("coolify_create_service_storage");
				return wrap(async () => {
					const result = await client.createServiceStorage(uuid, {
						name,
						mount_path,
						host_path,
						content,
					});
					return { message: `Storage '${name}' created`, uuid: result.uuid };
				});
			},
		);
	}

	if (isToolAllowed("coolify_update_service_storage", config)) {
		server.tool(
			"coolify_update_service_storage",
			"[WRITE] Update a persistent storage mount for a Coolify service",
			{
				uuid: schemas.uuid.describe("UUID of the service"),
				storage_uuid: schemas.uuid.describe("UUID of the storage to update"),
				name: z.string().optional().describe("Storage name"),
				mount_path: z.string().optional().describe("Container mount path"),
				host_path: z.string().optional().describe("Host path"),
				content: z.string().optional().describe("File content"),
				custom_fields: schemas.customFields,
			},
			async ({ uuid, storage_uuid, custom_fields, ...fields }) => {
				if (!isToolAllowed("coolify_update_service_storage", config))
					return readonlyError("coolify_update_service_storage");
				return wrap(async () => {
					const data: Record<string, unknown> = {};
					for (const [k, v] of Object.entries(fields)) {
						if (v !== undefined) data[k] = v;
					}
					if (custom_fields) Object.assign(data, custom_fields);
					await client.updateServiceStorage(uuid, storage_uuid, data);
					return `Service storage ${storage_uuid} updated`;
				});
			},
		);
	}

	if (isToolAllowed("coolify_delete_service_storage", config)) {
		server.tool(
			"coolify_delete_service_storage",
			"[DESTRUCTIVE] Remove a persistent storage mount from a Coolify service",
			{
				uuid: schemas.uuid.describe("UUID of the service"),
				storage_uuid: schemas.uuid.describe("UUID of the storage to delete"),
				confirm: schemas.confirm,
			},
			async ({ uuid, storage_uuid, confirm }) => {
				if (!isToolAllowed("coolify_delete_service_storage", config))
					return readonlyError("coolify_delete_service_storage");
				const check = checkConfirmation(
					"coolify_delete_service_storage",
					{ uuid, storage_uuid, confirm },
					config,
				);
				if (!check.proceed) return check.response!;
				return wrap(async () => {
					const result = await client.deleteServiceStorage(uuid, storage_uuid);
					return result.message || `Storage ${storage_uuid} deleted`;
				});
			},
		);
	}
}
