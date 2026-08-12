import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CoolifyClient } from "../client";
import type { Config } from "../config";
import { checkConfirmation, isToolAllowed, readonlyError } from "../lib/safety";
import * as schemas from "../lib/schemas";
import { wrap } from "../lib/wrap";
import { toStorageSummary } from "../types/api";

const storageType = z
	.enum(["persistent", "file"])
	.describe("Storage type: persistent volume or file mount");

export function registerDatabaseStorageTools(
	server: McpServer,
	client: CoolifyClient,
	config: Config,
) {
	server.tool(
		"coolify_list_database_storages",
		"List persistent and file storages for a Coolify database",
		{ uuid: schemas.uuid.describe("UUID of the database") },
		async ({ uuid }) => {
			return wrap(async () => {
				const storages = await client.listDatabaseStorages(uuid);
				return storages.map(toStorageSummary);
			});
		},
	);

	if (isToolAllowed("coolify_create_database_storage", config)) {
		server.tool(
			"coolify_create_database_storage",
			"[WRITE] Add a persistent or file storage mount to a Coolify database",
			{
				uuid: schemas.uuid.describe("UUID of the database"),
				type: storageType,
				name: z
					.string()
					.min(1)
					.optional()
					.describe("Volume name (required for persistent storages)"),
				mount_path: z.string().min(1).describe("Container mount path (e.g. /data)"),
				host_path: z.string().optional().describe("Host path (persistent only, optional)"),
				content: z.string().optional().describe("File content (file storages only)"),
				is_directory: z
					.boolean()
					.optional()
					.describe("Whether this is a directory mount (file only)"),
				fs_path: z
					.string()
					.optional()
					.describe("Host directory path (required when is_directory is true)"),
			},
			async ({ uuid, type, name, mount_path, host_path, content, is_directory, fs_path }) => {
				if (!isToolAllowed("coolify_create_database_storage", config))
					return readonlyError("coolify_create_database_storage");
				return wrap(async () => {
					const result = await client.createDatabaseStorage(uuid, {
						type,
						name,
						mount_path,
						host_path,
						content,
						is_directory,
						fs_path,
					});
					return {
						message: `Storage created (${type})`,
						uuid: result.uuid,
						...result,
					};
				});
			},
		);
	}

	if (isToolAllowed("coolify_update_database_storage", config)) {
		server.tool(
			"coolify_update_database_storage",
			"[WRITE] Update a persistent or file storage for a Coolify database (PATCH body includes storage uuid + type)",
			{
				uuid: schemas.uuid.describe("UUID of the database"),
				storage_uuid: schemas.uuid.describe("UUID of the storage to update"),
				type: storageType,
				name: z.string().optional().describe("Volume name (persistent only)"),
				mount_path: z.string().optional().describe("Container mount path"),
				host_path: z.string().nullable().optional().describe("Host path (persistent only)"),
				content: z.string().nullable().optional().describe("File content (file only)"),
				is_preview_suffix_enabled: z
					.boolean()
					.optional()
					.describe("Add -pr-N suffix for preview deployments"),
			},
			async ({ uuid, storage_uuid, type, ...fields }) => {
				if (!isToolAllowed("coolify_update_database_storage", config))
					return readonlyError("coolify_update_database_storage");
				return wrap(async () => {
					const data: {
						uuid: string;
						type: "persistent" | "file";
						name?: string;
						mount_path?: string;
						host_path?: string | null;
						content?: string | null;
						is_preview_suffix_enabled?: boolean;
					} = { uuid: storage_uuid, type };
					for (const [k, v] of Object.entries(fields)) {
						if (v !== undefined) (data as Record<string, unknown>)[k] = v;
					}
					await client.updateDatabaseStorage(uuid, data);
					return `Database storage ${storage_uuid} updated`;
				});
			},
		);
	}

	if (isToolAllowed("coolify_delete_database_storage", config)) {
		server.tool(
			"coolify_delete_database_storage",
			"[DESTRUCTIVE] Remove a persistent or file storage mount from a Coolify database",
			{
				uuid: schemas.uuid.describe("UUID of the database"),
				storage_uuid: schemas.uuid.describe("UUID of the storage to delete"),
				confirm: schemas.confirm,
			},
			async ({ uuid, storage_uuid, confirm }) => {
				if (!isToolAllowed("coolify_delete_database_storage", config))
					return readonlyError("coolify_delete_database_storage");
				const check = checkConfirmation(
					"coolify_delete_database_storage",
					{ uuid, storage_uuid, confirm },
					config,
				);
				if (!check.proceed) return check.response!;
				return wrap(async () => {
					const result = await client.deleteDatabaseStorage(uuid, storage_uuid);
					return result.message || `Storage ${storage_uuid} deleted`;
				});
			},
		);
	}
}
