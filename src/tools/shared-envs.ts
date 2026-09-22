import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CoolifyClient, SharedEnvScope } from "../client";
import type { Config } from "../config";
import { definedRecord, registerApiTool } from "../lib/register-tool";
import * as schemas from "../lib/schemas";

const scope = z
	.enum(["team", "project", "environment", "server"])
	.describe("Where the shared variable lives");

const scopeFields = {
	scope,
	project_uuid: schemas.uuid.optional().describe("Project UUID (project and environment scopes)"),
	environment_name_or_uuid: z
		.string()
		.min(1)
		.optional()
		.describe("Environment name or UUID (environment scope)"),
	server_uuid: schemas.uuid.optional().describe("Server UUID (server scope)"),
};

const envFields = {
	key: z.string().min(1).optional().describe("Variable key"),
	value: z.string().nullable().optional().describe("Variable value"),
	is_literal: z.boolean().optional(),
	is_multiline: z.boolean().optional(),
	is_shown_once: z.boolean().optional(),
	comment: z.string().max(256).nullable().optional(),
};

type ScopeArgs = {
	scope: "team" | "project" | "environment" | "server";
	project_uuid?: string;
	environment_name_or_uuid?: string;
	server_uuid?: string;
};

function toScope(args: ScopeArgs): SharedEnvScope {
	switch (args.scope) {
		case "team":
			return { scope: "team" };
		case "project":
			if (!args.project_uuid) throw new Error("project_uuid is required when scope is project.");
			return { scope: "project", projectUuid: args.project_uuid };
		case "environment":
			if (!args.project_uuid || !args.environment_name_or_uuid) {
				throw new Error(
					"project_uuid and environment_name_or_uuid are required when scope is environment.",
				);
			}
			return {
				scope: "environment",
				projectUuid: args.project_uuid,
				environmentNameOrUuid: args.environment_name_or_uuid,
			};
		case "server":
			if (!args.server_uuid) throw new Error("server_uuid is required when scope is server.");
			return { scope: "server", serverUuid: args.server_uuid };
	}
}

function envPayload(args: Record<string, unknown>): Record<string, unknown> {
	return definedRecord({
		key: args.key,
		value: args.value,
		is_literal: args.is_literal,
		is_multiline: args.is_multiline,
		is_shown_once: args.is_shown_once,
		comment: args.comment,
	});
}

export function registerSharedEnvTools(server: McpServer, client: CoolifyClient, config: Config) {
	registerApiTool<ScopeArgs>(
		server,
		config,
		"coolify_list_shared_envs",
		"List shared environment variables for the team, a project, an environment, or a server",
		scopeFields,
		async (args) => client.listSharedEnvs(toScope(args)),
	);

	registerApiTool<ScopeArgs & { key?: string; value?: string | null }>(
		server,
		config,
		"coolify_create_shared_env",
		"[WRITE] Create a shared environment variable. key is required. The id in the response is the numeric id used by update and delete.",
		{ ...scopeFields, ...envFields, key: z.string().min(1).describe("Variable key") },
		async (args) => {
			const payload = envPayload(args);
			if (!payload.key) throw new Error("key is required.");
			return client.createSharedEnv(toScope(args), payload);
		},
	);

	registerApiTool<ScopeArgs & { env_id: number }>(
		server,
		config,
		"coolify_update_shared_env",
		"[WRITE] Update a shared environment variable by its numeric id",
		{
			...scopeFields,
			...envFields,
			env_id: z.number().int().positive().describe("Numeric id of the shared variable"),
		},
		async (args) => {
			const payload = envPayload(args);
			if (Object.keys(payload).length === 0)
				throw new Error("Provide at least one field to update.");
			return client.updateSharedEnv(toScope(args), args.env_id, payload);
		},
	);

	registerApiTool<ScopeArgs & { env_id: number; confirm?: boolean }>(
		server,
		config,
		"coolify_delete_shared_env",
		"[DESTRUCTIVE] Delete a shared environment variable by its numeric id",
		{
			...scopeFields,
			env_id: z.number().int().positive().describe("Numeric id of the shared variable"),
			confirm: schemas.confirm,
		},
		async (args) => client.deleteSharedEnv(toScope(args), args.env_id),
	);
}
