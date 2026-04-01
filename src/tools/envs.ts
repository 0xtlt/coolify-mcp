import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CoolifyClient } from "../client";
import type { Config } from "../config";
import { checkConfirmation, isToolAllowed, readonlyError } from "../lib/safety";
import * as schemas from "../lib/schemas";
import { wrap } from "../lib/wrap";

export function registerEnvTools(server: McpServer, client: CoolifyClient, config: Config) {
	server.tool(
		"coolify_list_envs",
		"List all environment variables for a Coolify application",
		{ uuid: schemas.uuid.describe("UUID of the application") },
		async ({ uuid }) => {
			return wrap(() => client.listEnvs(uuid));
		},
	);

	if (isToolAllowed("coolify_create_env", config)) {
		server.tool(
			"coolify_create_env",
			"[WRITE] Create a new environment variable for a Coolify application",
			{
				uuid: schemas.uuid.describe("UUID of the application"),
				key: z.string().min(1).describe("Variable name (e.g. DATABASE_URL)"),
				value: z.string().describe("Variable value"),
				is_preview: z
					.boolean()
					.default(false)
					.describe("Only for pull request preview deployments"),
				is_literal: z.boolean().default(false).describe("Do not interpolate/expand the value"),
				is_multiline: z.boolean().default(false).describe("Value contains newlines"),
				is_shown_once: z.boolean().default(false).describe("Value is only shown once then hidden"),
				comment: z.string().optional().describe("Comment or note for this variable"),
			},
			async ({
				uuid,
				key,
				value,
				is_preview,
				is_literal,
				is_multiline,
				is_shown_once,
				comment,
			}) => {
				if (!isToolAllowed("coolify_create_env", config))
					return readonlyError("coolify_create_env");
				return wrap(async () => {
					const result = await client.createEnv(uuid, {
						key,
						value,
						is_preview,
						is_literal,
						is_multiline,
						is_shown_once,
						comment,
					});
					return { message: `Environment variable '${key}' created`, env_uuid: result.uuid };
				});
			},
		);
	}

	if (isToolAllowed("coolify_update_envs_bulk", config)) {
		server.tool(
			"coolify_update_envs_bulk",
			"[WRITE] Bulk update environment variables for a Coolify application (creates or updates)",
			{
				uuid: schemas.uuid.describe("UUID of the application"),
				envs: z
					.array(
						z.object({
							key: z.string().min(1),
							value: z.string(),
							is_preview: z.boolean().optional(),
							is_literal: z.boolean().optional(),
							is_multiline: z.boolean().optional(),
							is_shown_once: z.boolean().optional(),
							comment: z.string().optional(),
						}),
					)
					.min(1)
					.describe("Array of environment variables to set"),
			},
			async ({ uuid, envs }) => {
				if (!isToolAllowed("coolify_update_envs_bulk", config))
					return readonlyError("coolify_update_envs_bulk");
				return wrap(async () => {
					const result = await client.updateEnvsBulk(uuid, envs);
					return `${result.length} environment variable(s) updated`;
				});
			},
		);
	}

	if (isToolAllowed("coolify_delete_env", config)) {
		server.tool(
			"coolify_delete_env",
			"[DESTRUCTIVE] Delete an environment variable from a Coolify application",
			{
				uuid: schemas.uuid.describe("UUID of the application"),
				env_uuid: schemas.uuid.describe("UUID of the environment variable to delete"),
				confirm: schemas.confirm,
			},
			async ({ uuid, env_uuid, confirm }) => {
				if (!isToolAllowed("coolify_delete_env", config))
					return readonlyError("coolify_delete_env");
				const check = checkConfirmation("coolify_delete_env", { uuid, env_uuid, confirm }, config);
				if (!check.proceed) return check.response!;
				return wrap(async () => {
					const result = await client.deleteEnv(uuid, env_uuid);
					return result.message || `Environment variable ${env_uuid} deleted`;
				});
			},
		);
	}
}
