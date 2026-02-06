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
		{ tool: "coolify_list_database_backups", args: { uuid }, hint: "View backups" },
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
