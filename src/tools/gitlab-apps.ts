import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CoolifyClient } from "../client";
import type { Config } from "../config";
import { definedRecord, registerApiTool } from "../lib/register-tool";
import * as schemas from "../lib/schemas";

const gitlabFields = {
	name: z.string().max(255).optional(),
	html_url: z.string().optional().describe("GitLab HTML URL"),
	api_url: z.string().nullable().optional().describe("GitLab API URL"),
	custom_user: z.string().max(255).nullable().optional(),
	custom_port: z.number().int().min(1).max(65535).nullable().optional(),
	group_name: z.string().max(255).nullable().optional(),
	client_id: z.string().max(255).nullable().optional(),
	client_secret: z.string().nullable().optional(),
	webhook_token: z.string().nullable().optional(),
	redirect_uri: z.string().nullable().optional(),
	is_system_wide: z.boolean().optional().describe("Ignored on Coolify Cloud"),
};

export function registerGitLabAppTools(server: McpServer, client: CoolifyClient, config: Config) {
	registerApiTool(
		server,
		config,
		"coolify_list_gitlab_apps",
		"List GitLab App integrations for the current team",
		{},
		async () => client.listGitLabApps(),
	);

	registerApiTool<Record<string, unknown>>(
		server,
		config,
		"coolify_create_gitlab_app",
		"[WRITE] Create a GitLab App integration. name and html_url are required.",
		{
			...gitlabFields,
			name: z.string().min(1).max(255),
			html_url: z.string().min(1).describe("GitLab HTML URL"),
		},
		async (args) => client.createGitLabApp(definedRecord(args)),
	);

	registerApiTool<Record<string, unknown> & { id: number }>(
		server,
		config,
		"coolify_update_gitlab_app",
		"[WRITE] Update a GitLab App integration",
		{ id: schemas.numericId.describe("GitLab App id"), ...gitlabFields },
		async ({ id, ...rest }) => {
			const data = definedRecord(rest);
			if (Object.keys(data).length === 0) throw new Error("Provide at least one field to update.");
			return client.updateGitLabApp(id, data);
		},
	);

	registerApiTool<{ id: number; confirm?: boolean }>(
		server,
		config,
		"coolify_delete_gitlab_app",
		"[DESTRUCTIVE] Delete a GitLab App integration",
		{ id: schemas.numericId.describe("GitLab App id"), confirm: schemas.confirm },
		async ({ id }) => client.deleteGitLabApp(id),
	);
}
