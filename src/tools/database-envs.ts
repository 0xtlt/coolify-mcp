import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CoolifyClient } from "../client";
import type { Config } from "../config";
import { checkConfirmation, isToolAllowed, readonlyError } from "../lib/safety";
import * as schemas from "../lib/schemas";
import { wrap } from "../lib/wrap";

export function registerDatabaseEnvTools(server: McpServer, client: CoolifyClient, config: Config) {
	server.tool(
		"coolify_list_database_envs",
		"List all environment variables for a Coolify database",
		{ uuid: schemas.uuid.describe("UUID of the database") },
		async ({ uuid }) => {
			return wrap(() => client.listDatabaseEnvs(uuid));
		},
	);

	if (isToolAllowed("coolify_create_database_env", config)) {
		server.tool(
			"coolify_create_database_env",
			"[WRITE] Create a new environment variable for a Coolify database",
			{
				uuid: schemas.uuid.describe("UUID of the database"),
				key: z.string().min(1).describe("Variable name (e.g. POSTGRES_PASSWORD)"),
				value: z.string().describe("Variable value"),
				is_preview: z.boolean().default(false).describe("Only for preview deployments"),
				is_literal: z.boolean().default(false).describe("Do not interpolate/expand the value"),
				is_multiline: z.boolean().default(false).describe("Value contains newlines"),
				is_shown_once: z.boolean().default(false).describe("Value is only shown once then hidden"),
			},
			async ({ uuid, key, value, is_preview, is_literal, is_multiline, is_shown_once }) => {
				if (!isToolAllowed("coolify_create_database_env", config))
					return readonlyError("coolify_create_database_env");
				return wrap(async () => {
					const result = await client.createDatabaseEnv(uuid, {
						key,
						value,
						is_preview,
						is_literal,
						is_multiline,
						is_shown_once,
					});
					return { message: `Database env var '${key}' created`, env_uuid: result.uuid };
				});
			},
		);
	}

	if (isToolAllowed("coolify_update_database_envs_bulk", config)) {
		server.tool(
			"coolify_update_database_envs_bulk",
			"[WRITE] Bulk update environment variables for a Coolify database (creates or updates)",
			{
				uuid: schemas.uuid.describe("UUID of the database"),
				envs: z
					.array(
						z.object({
							key: z.string().min(1),
							value: z.string(),
							is_preview: z.boolean().optional(),
							is_literal: z.boolean().optional(),
							is_multiline: z.boolean().optional(),
							is_shown_once: z.boolean().optional(),
						}),
					)
					.min(1)
					.describe("Array of environment variables to set"),
			},
			async ({ uuid, envs }) => {
				if (!isToolAllowed("coolify_update_database_envs_bulk", config))
					return readonlyError("coolify_update_database_envs_bulk");
				return wrap(async () => {
					const result = await client.updateDatabaseEnvsBulk(uuid, envs);
					return `${result.length} database environment variable(s) updated`;
				});
			},
		);
	}

	if (isToolAllowed("coolify_delete_database_env", config)) {
		server.tool(
			"coolify_delete_database_env",
			"[DESTRUCTIVE] Delete an environment variable from a Coolify database",
			{
				uuid: schemas.uuid.describe("UUID of the database"),
				env_uuid: schemas.uuid.describe("UUID of the environment variable to delete"),
				confirm: schemas.confirm,
			},
			async ({ uuid, env_uuid, confirm }) => {
				if (!isToolAllowed("coolify_delete_database_env", config))
					return readonlyError("coolify_delete_database_env");
				const check = checkConfirmation(
					"coolify_delete_database_env",
					{ uuid, env_uuid, confirm },
					config,
				);
				if (!check.proceed) return check.response!;
				return wrap(async () => {
					const result = await client.deleteDatabaseEnv(uuid, env_uuid);
					return result.message || `Database env var ${env_uuid} deleted`;
				});
			},
		);
	}
}
