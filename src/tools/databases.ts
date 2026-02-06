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
	];
	if (status === "running" || status?.startsWith("running:")) {
		actions.push({ tool: "coolify_trigger_deploy", args: { uuid }, hint: "Deploy" });
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
}
