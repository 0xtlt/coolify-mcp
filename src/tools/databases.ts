import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CoolifyClient } from "../client";
import type { Config } from "../config";
import { checkConfirmation, isToolAllowed, readonlyError } from "../lib/safety";
import * as schemas from "../lib/schemas";
import { type ResponseAction, wrap, wrapWithActions } from "../lib/wrap";
import type { Database } from "../types/api";
import { toDatabaseSummary } from "../types/api";

function getDatabaseActions(uuid: string, status?: string): ResponseAction[] {
	const actions: ResponseAction[] = [
		{ tool: "coolify_get_database_logs", args: { uuid }, hint: "View logs" },
		{ tool: "coolify_list_database_backups", args: { uuid }, hint: "View backups" },
		{ tool: "coolify_create_database_backup", args: { uuid }, hint: "Create backup" },
		{ tool: "coolify_update_database", args: { uuid }, hint: "Update config" },
	];
	if (status === "running" || status?.startsWith("running:")) {
		actions.push(
			{ tool: "coolify_restart_database", args: { uuid }, hint: "Restart" },
			{ tool: "coolify_stop_database", args: { uuid }, hint: "Stop" },
		);
	} else if (status === "exited" || status?.startsWith("exited:")) {
		actions.push({ tool: "coolify_start_database", args: { uuid }, hint: "Start" });
	}
	actions.push({ tool: "coolify_delete_database", args: { uuid }, hint: "Delete" });
	return actions;
}

export function registerDatabaseTools(server: McpServer, client: CoolifyClient, config: Config) {
	server.tool(
		"coolify_list_databases",
		"List all databases managed by Coolify (returns summary: uuid, name, database_type, status)",
		{},
		async () => {
			return wrap(async () => {
				const dbs = await client.listDatabases();
				return dbs.map(toDatabaseSummary);
			});
		},
	);

	server.tool(
		"coolify_get_database",
		"Get detailed information about a specific Coolify database",
		{ uuid: schemas.uuid },
		async ({ uuid }) => {
			return wrapWithActions(
				() => client.getDatabase(uuid),
				(db: Database) => getDatabaseActions(uuid, db.status),
			);
		},
	);

	server.tool(
		"coolify_list_database_backups",
		"List backups for a specific database",
		{ uuid: schemas.uuid.describe("UUID of the database") },
		async ({ uuid }) => {
			return wrap(() => client.listDatabaseBackups(uuid));
		},
	);

	if (isToolAllowed("coolify_delete_database", config)) {
		server.tool(
			"coolify_delete_database",
			"[DESTRUCTIVE] Permanently delete a Coolify database",
			{
				uuid: schemas.uuid,
				confirm: schemas.confirm,
				delete_volumes: z.boolean().default(true).describe("Also delete associated volumes"),
				docker_cleanup: z.boolean().default(true).describe("Clean up Docker resources"),
			},
			async ({ uuid, confirm, delete_volumes, docker_cleanup }) => {
				if (!isToolAllowed("coolify_delete_database", config))
					return readonlyError("coolify_delete_database");
				const check = checkConfirmation("coolify_delete_database", { uuid, confirm }, config);
				if (!check.proceed) return check.response!;
				return wrap(async () => {
					const result = await client.deleteDatabase(uuid, { delete_volumes, docker_cleanup });
					return result.message || `Database ${uuid} deleted`;
				});
			},
		);
	}

	// Write: start
	if (isToolAllowed("coolify_start_database", config)) {
		server.tool(
			"coolify_start_database",
			"[WRITE] Start a stopped Coolify database",
			{ uuid: schemas.uuid },
			async ({ uuid }) => {
				if (!isToolAllowed("coolify_start_database", config))
					return readonlyError("coolify_start_database");
				return wrap(async () => {
					const result = await client.startDatabase(uuid);
					return result.message || `Database ${uuid} start command sent`;
				});
			},
		);
	}

	// Destructive: stop
	if (isToolAllowed("coolify_stop_database", config)) {
		server.tool(
			"coolify_stop_database",
			"[DESTRUCTIVE] Stop a running Coolify database. Causes downtime.",
			{ uuid: schemas.uuid, confirm: schemas.confirm },
			async ({ uuid, confirm }) => {
				if (!isToolAllowed("coolify_stop_database", config))
					return readonlyError("coolify_stop_database");
				const check = checkConfirmation("coolify_stop_database", { uuid, confirm }, config);
				if (!check.proceed) return check.response!;
				return wrap(async () => {
					const result = await client.stopDatabase(uuid);
					return result.message || `Database ${uuid} stop command sent`;
				});
			},
		);
	}

	// Destructive: restart
	if (isToolAllowed("coolify_restart_database", config)) {
		server.tool(
			"coolify_restart_database",
			"[DESTRUCTIVE] Restart a Coolify database. Causes brief downtime.",
			{ uuid: schemas.uuid, confirm: schemas.confirm },
			async ({ uuid, confirm }) => {
				if (!isToolAllowed("coolify_restart_database", config))
					return readonlyError("coolify_restart_database");
				const check = checkConfirmation("coolify_restart_database", { uuid, confirm }, config);
				if (!check.proceed) return check.response!;
				return wrap(async () => {
					const result = await client.restartDatabase(uuid);
					return result.message || `Database ${uuid} restart command sent`;
				});
			},
		);
	}

	// Write: create
	if (isToolAllowed("coolify_create_database", config)) {
		server.tool(
			"coolify_create_database",
			"[WRITE] Create a new Coolify database",
			{
				type: z
					.enum([
						"postgresql",
						"mysql",
						"mariadb",
						"mongodb",
						"redis",
						"dragonfly",
						"keydb",
						"clickhouse",
					])
					.describe("Database engine type"),
				server_uuid: schemas.serverUuid,
				project_uuid: schemas.projectUuid,
				environment_name: schemas.environmentName,
				name: z.string().optional().describe("Database name"),
				description: z.string().optional().describe("Database description"),
				image: z.string().optional().describe("Docker image (e.g. postgres:16-alpine)"),
				is_public: z.boolean().optional().describe("Make database publicly accessible"),
				public_port: z.number().optional().describe("Public port number"),
				limits_memory: z.string().optional().describe("Memory limit (e.g. 512m, 1g)"),
				limits_cpus: z.string().optional().describe("CPU limit (e.g. 0.5, 2)"),
				instant_deploy: schemas.instantDeploy,
				type_config: z
					.record(z.string(), z.unknown())
					.optional()
					.describe(
						"Type-specific config. Postgres: postgres_user, postgres_password, postgres_db. MySQL/MariaDB: mysql_root_password, mysql_database, mysql_user, mysql_password. MongoDB: mongo_initdb_root_username, mongo_initdb_root_password. Redis: redis_password. ClickHouse: clickhouse_admin_user, clickhouse_admin_password",
					),
				custom_fields: schemas.customFields,
			},
			async ({
				type,
				server_uuid,
				project_uuid,
				environment_name,
				type_config,
				custom_fields,
				...fields
			}) => {
				if (!isToolAllowed("coolify_create_database", config))
					return readonlyError("coolify_create_database");
				return wrap(async () => {
					const data: Record<string, unknown> = {
						server_uuid,
						project_uuid,
						environment_name,
					};
					for (const [k, v] of Object.entries(fields)) {
						if (v !== undefined) data[k] = v;
					}
					if (type_config) Object.assign(data, type_config);
					if (custom_fields) Object.assign(data, custom_fields);
					const result = await client.createDatabase(type, data);
					return { message: `Database (${type}) created`, uuid: result.uuid };
				});
			},
		);
	}

	// Write: create backup
	if (isToolAllowed("coolify_create_database_backup", config)) {
		server.tool(
			"coolify_create_database_backup",
			"[WRITE] Create a backup of a Coolify database",
			{ uuid: schemas.uuid.describe("UUID of the database") },
			async ({ uuid }) => {
				if (!isToolAllowed("coolify_create_database_backup", config))
					return readonlyError("coolify_create_database_backup");
				return wrap(async () => {
					const result = await client.createDatabaseBackup(uuid);
					return result.message || `Backup created for database ${uuid}`;
				});
			},
		);
	}

	// Destructive: delete backup
	if (isToolAllowed("coolify_delete_database_backup", config)) {
		server.tool(
			"coolify_delete_database_backup",
			"[DESTRUCTIVE] Delete a backup of a Coolify database",
			{
				uuid: schemas.uuid.describe("UUID of the database"),
				backup_id: z.number().int().describe("ID of the backup to delete"),
				confirm: schemas.confirm,
			},
			async ({ uuid, backup_id, confirm }) => {
				if (!isToolAllowed("coolify_delete_database_backup", config))
					return readonlyError("coolify_delete_database_backup");
				const check = checkConfirmation(
					"coolify_delete_database_backup",
					{ uuid, backup_id, confirm },
					config,
				);
				if (!check.proceed) return check.response!;
				return wrap(async () => {
					const result = await client.deleteDatabaseBackup(uuid, backup_id);
					return result.message || `Backup ${backup_id} deleted`;
				});
			},
		);
	}

	// Write: restore backup
	if (isToolAllowed("coolify_restore_database_backup", config)) {
		server.tool(
			"coolify_restore_database_backup",
			"[WRITE] Restore a Coolify database from a backup",
			{
				uuid: schemas.uuid.describe("UUID of the database"),
				backup_id: z.number().int().describe("ID of the backup to restore"),
			},
			async ({ uuid, backup_id }) => {
				if (!isToolAllowed("coolify_restore_database_backup", config))
					return readonlyError("coolify_restore_database_backup");
				return wrap(async () => {
					const result = await client.restoreDatabaseBackup(uuid, backup_id);
					return result.message || `Database ${uuid} restore from backup ${backup_id} started`;
				});
			},
		);
	}

	// Write: update
	if (isToolAllowed("coolify_update_database", config)) {
		server.tool(
			"coolify_update_database",
			"[WRITE] Update configuration of a Coolify database",
			{
				uuid: schemas.uuid,
				name: z.string().optional().describe("Database name"),
				description: z.string().optional().describe("Database description"),
				image: z.string().optional().describe("Docker image (e.g. postgres:16-alpine)"),
				is_public: z.boolean().optional().describe("Make database publicly accessible"),
				public_port: z.number().optional().describe("Public port number"),
				limits_memory: z.string().optional().describe("Memory limit (e.g. 512m, 1g)"),
				limits_cpus: z.string().optional().describe("CPU limit (e.g. 0.5, 2)"),
				custom_fields: z
					.record(z.string(), z.unknown())
					.optional()
					.describe("Additional fields not listed above (advanced)"),
			},
			async ({ uuid, custom_fields, ...fields }) => {
				if (!isToolAllowed("coolify_update_database", config))
					return readonlyError("coolify_update_database");
				return wrap(async () => {
					const data: Record<string, unknown> = {};
					for (const [k, v] of Object.entries(fields)) {
						if (v !== undefined) data[k] = v;
					}
					if (custom_fields) Object.assign(data, custom_fields);
					await client.updateDatabase(uuid, data);
					return `Database ${uuid} updated`;
				});
			},
		);
	}
}
