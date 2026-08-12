import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CoolifyClient } from "../client";
import type { Config } from "../config";
import { checkConfirmation, isToolAllowed, readonlyError } from "../lib/safety";
import * as schemas from "../lib/schemas";
import { wrap } from "../lib/wrap";
import type { VolumeBackupScheduleInput } from "../types/api";

const scheduleFields = {
	frequency: z.string().min(1).describe("Cron frequency for the backup (e.g. '0 2 * * *')"),
	enabled: z.boolean().optional().describe("Whether the schedule is enabled (default true)"),
	save_s3: z.boolean().optional().describe("Also upload backups to S3"),
	disable_local_backup: z.boolean().optional().describe("Disable local backup retention"),
	stop_during_backup: z.boolean().optional().describe("Stop the resource during backup"),
	s3_storage_uuid: z
		.string()
		.nullable()
		.optional()
		.describe("S3 storage UUID when save_s3 is true"),
	retention_amount_locally: z.number().int().min(0).optional(),
	retention_days_locally: z.number().int().min(0).optional(),
	retention_max_storage_locally: z.number().min(0).optional(),
	retention_amount_s3: z.number().int().min(0).optional(),
	retention_days_s3: z.number().int().min(0).optional(),
	retention_max_storage_s3: z.number().min(0).optional(),
	timeout: z.number().int().optional().describe("Backup timeout in seconds"),
};

function toScheduleInput(
	fields: Record<string, unknown> & { frequency: string },
): VolumeBackupScheduleInput {
	const data: VolumeBackupScheduleInput = { frequency: fields.frequency };
	for (const [k, v] of Object.entries(fields)) {
		if (k === "frequency") continue;
		if (v !== undefined) (data as unknown as Record<string, unknown>)[k] = v;
	}
	return data;
}

export function registerVolumeBackupTools(
	server: McpServer,
	client: CoolifyClient,
	config: Config,
) {
	// Application volume backups
	if (isToolAllowed("coolify_set_application_storage_backup", config)) {
		server.tool(
			"coolify_set_application_storage_backup",
			"[WRITE] Create or replace a backup schedule for an application persistent volume/directory",
			{
				uuid: schemas.uuid.describe("UUID of the application"),
				storage_uuid: schemas.uuid.describe("UUID of the persistent volume or directory storage"),
				...scheduleFields,
			},
			async ({ uuid, storage_uuid, ...fields }) => {
				if (!isToolAllowed("coolify_set_application_storage_backup", config))
					return readonlyError("coolify_set_application_storage_backup");
				return wrap(() =>
					client.upsertApplicationStorageBackup(uuid, storage_uuid, toScheduleInput(fields)),
				);
			},
		);
	}

	if (isToolAllowed("coolify_run_application_storage_backup", config)) {
		server.tool(
			"coolify_run_application_storage_backup",
			"[WRITE] Run an on-demand backup for an application storage",
			{
				uuid: schemas.uuid.describe("UUID of the application"),
				storage_uuid: schemas.uuid.describe("UUID of the storage"),
			},
			async ({ uuid, storage_uuid }) => {
				if (!isToolAllowed("coolify_run_application_storage_backup", config))
					return readonlyError("coolify_run_application_storage_backup");
				return wrap(async () => {
					const result = await client.runApplicationStorageBackup(uuid, storage_uuid);
					return result.message || `Backup started for storage ${storage_uuid}`;
				});
			},
		);
	}

	if (isToolAllowed("coolify_delete_application_storage_backup", config)) {
		server.tool(
			"coolify_delete_application_storage_backup",
			"[DESTRUCTIVE] Delete the backup schedule and archives for an application storage",
			{
				uuid: schemas.uuid.describe("UUID of the application"),
				storage_uuid: schemas.uuid.describe("UUID of the storage"),
				confirm: schemas.confirm,
			},
			async ({ uuid, storage_uuid, confirm }) => {
				if (!isToolAllowed("coolify_delete_application_storage_backup", config))
					return readonlyError("coolify_delete_application_storage_backup");
				const check = checkConfirmation(
					"coolify_delete_application_storage_backup",
					{ uuid, storage_uuid, confirm },
					config,
				);
				if (!check.proceed) return check.response!;
				return wrap(async () => {
					const result = await client.deleteApplicationStorageBackup(uuid, storage_uuid);
					return result.message || `Storage backup schedule ${storage_uuid} deleted`;
				});
			},
		);
	}

	// Database volume backups
	if (isToolAllowed("coolify_set_database_storage_backup", config)) {
		server.tool(
			"coolify_set_database_storage_backup",
			"[WRITE] Create or replace a backup schedule for a database persistent volume/directory",
			{
				uuid: schemas.uuid.describe("UUID of the database"),
				storage_uuid: schemas.uuid.describe("UUID of the persistent volume or directory storage"),
				...scheduleFields,
			},
			async ({ uuid, storage_uuid, ...fields }) => {
				if (!isToolAllowed("coolify_set_database_storage_backup", config))
					return readonlyError("coolify_set_database_storage_backup");
				return wrap(() =>
					client.upsertDatabaseStorageBackup(uuid, storage_uuid, toScheduleInput(fields)),
				);
			},
		);
	}

	if (isToolAllowed("coolify_run_database_storage_backup", config)) {
		server.tool(
			"coolify_run_database_storage_backup",
			"[WRITE] Run an on-demand backup for a database storage",
			{
				uuid: schemas.uuid.describe("UUID of the database"),
				storage_uuid: schemas.uuid.describe("UUID of the storage"),
			},
			async ({ uuid, storage_uuid }) => {
				if (!isToolAllowed("coolify_run_database_storage_backup", config))
					return readonlyError("coolify_run_database_storage_backup");
				return wrap(async () => {
					const result = await client.runDatabaseStorageBackup(uuid, storage_uuid);
					return result.message || `Backup started for storage ${storage_uuid}`;
				});
			},
		);
	}

	if (isToolAllowed("coolify_delete_database_storage_backup", config)) {
		server.tool(
			"coolify_delete_database_storage_backup",
			"[DESTRUCTIVE] Delete the backup schedule and archives for a database storage",
			{
				uuid: schemas.uuid.describe("UUID of the database"),
				storage_uuid: schemas.uuid.describe("UUID of the storage"),
				confirm: schemas.confirm,
			},
			async ({ uuid, storage_uuid, confirm }) => {
				if (!isToolAllowed("coolify_delete_database_storage_backup", config))
					return readonlyError("coolify_delete_database_storage_backup");
				const check = checkConfirmation(
					"coolify_delete_database_storage_backup",
					{ uuid, storage_uuid, confirm },
					config,
				);
				if (!check.proceed) return check.response!;
				return wrap(async () => {
					const result = await client.deleteDatabaseStorageBackup(uuid, storage_uuid);
					return result.message || `Storage backup schedule ${storage_uuid} deleted`;
				});
			},
		);
	}

	// Service volume backups
	if (isToolAllowed("coolify_set_service_storage_backup", config)) {
		server.tool(
			"coolify_set_service_storage_backup",
			"[WRITE] Create or replace a backup schedule for a service persistent volume/directory",
			{
				uuid: schemas.uuid.describe("UUID of the service"),
				storage_uuid: schemas.uuid.describe("UUID of the persistent volume or directory storage"),
				...scheduleFields,
			},
			async ({ uuid, storage_uuid, ...fields }) => {
				if (!isToolAllowed("coolify_set_service_storage_backup", config))
					return readonlyError("coolify_set_service_storage_backup");
				return wrap(() =>
					client.upsertServiceStorageBackup(uuid, storage_uuid, toScheduleInput(fields)),
				);
			},
		);
	}

	if (isToolAllowed("coolify_run_service_storage_backup", config)) {
		server.tool(
			"coolify_run_service_storage_backup",
			"[WRITE] Run an on-demand backup for a service storage",
			{
				uuid: schemas.uuid.describe("UUID of the service"),
				storage_uuid: schemas.uuid.describe("UUID of the storage"),
			},
			async ({ uuid, storage_uuid }) => {
				if (!isToolAllowed("coolify_run_service_storage_backup", config))
					return readonlyError("coolify_run_service_storage_backup");
				return wrap(async () => {
					const result = await client.runServiceStorageBackup(uuid, storage_uuid);
					return result.message || `Backup started for storage ${storage_uuid}`;
				});
			},
		);
	}

	if (isToolAllowed("coolify_delete_service_storage_backup", config)) {
		server.tool(
			"coolify_delete_service_storage_backup",
			"[DESTRUCTIVE] Delete the backup schedule and archives for a service storage",
			{
				uuid: schemas.uuid.describe("UUID of the service"),
				storage_uuid: schemas.uuid.describe("UUID of the storage"),
				confirm: schemas.confirm,
			},
			async ({ uuid, storage_uuid, confirm }) => {
				if (!isToolAllowed("coolify_delete_service_storage_backup", config))
					return readonlyError("coolify_delete_service_storage_backup");
				const check = checkConfirmation(
					"coolify_delete_service_storage_backup",
					{ uuid, storage_uuid, confirm },
					config,
				);
				if (!check.proceed) return check.response!;
				return wrap(async () => {
					const result = await client.deleteServiceStorageBackup(uuid, storage_uuid);
					return result.message || `Storage backup schedule ${storage_uuid} deleted`;
				});
			},
		);
	}
}
