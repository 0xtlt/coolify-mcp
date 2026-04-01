import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CoolifyClient } from "../client";
import type { Config } from "../config";
import { checkConfirmation, isToolAllowed, readonlyError } from "../lib/safety";
import * as schemas from "../lib/schemas";
import { wrap } from "../lib/wrap";
import { toGitHubAppSummary } from "../types/api";

export function registerGitHubAppTools(server: McpServer, client: CoolifyClient, config: Config) {
	server.tool(
		"coolify_list_github_apps",
		"List all GitHub App integrations configured in Coolify",
		{},
		async () => {
			return wrap(async () => {
				const apps = await client.listGitHubApps();
				return apps.map(toGitHubAppSummary);
			});
		},
	);

	if (isToolAllowed("coolify_create_github_app", config)) {
		server.tool(
			"coolify_create_github_app",
			"[WRITE] Create a new GitHub App integration in Coolify",
			{
				name: z.string().min(1).describe("GitHub App name"),
				custom_fields: schemas.customFields,
			},
			async ({ name, custom_fields }) => {
				if (!isToolAllowed("coolify_create_github_app", config))
					return readonlyError("coolify_create_github_app");
				return wrap(async () => {
					const data: Record<string, unknown> = { name };
					if (custom_fields) Object.assign(data, custom_fields);
					const result = await client.createGitHubApp(data);
					return { message: `GitHub App '${name}' created`, id: result.id };
				});
			},
		);
	}

	if (isToolAllowed("coolify_update_github_app", config)) {
		server.tool(
			"coolify_update_github_app",
			"[WRITE] Update a GitHub App integration in Coolify",
			{
				id: schemas.numericId.describe("ID of the GitHub App"),
				name: z.string().optional().describe("GitHub App name"),
				custom_fields: schemas.customFields,
			},
			async ({ id, name, custom_fields }) => {
				if (!isToolAllowed("coolify_update_github_app", config))
					return readonlyError("coolify_update_github_app");
				return wrap(async () => {
					const data: Record<string, unknown> = {};
					if (name !== undefined) data.name = name;
					if (custom_fields) Object.assign(data, custom_fields);
					await client.updateGitHubApp(id, data);
					return `GitHub App ${id} updated`;
				});
			},
		);
	}

	if (isToolAllowed("coolify_delete_github_app", config)) {
		server.tool(
			"coolify_delete_github_app",
			"[DESTRUCTIVE] Delete a GitHub App integration from Coolify",
			{
				id: schemas.numericId.describe("ID of the GitHub App"),
				confirm: schemas.confirm,
			},
			async ({ id, confirm }) => {
				if (!isToolAllowed("coolify_delete_github_app", config))
					return readonlyError("coolify_delete_github_app");
				const check = checkConfirmation("coolify_delete_github_app", { id, confirm }, config);
				if (!check.proceed) return check.response!;
				return wrap(async () => {
					const result = await client.deleteGitHubApp(id);
					return result.message || `GitHub App ${id} deleted`;
				});
			},
		);
	}

	server.tool(
		"coolify_list_github_app_repositories",
		"List repositories accessible by a GitHub App",
		{ id: schemas.numericId.describe("ID of the GitHub App") },
		async ({ id }) => {
			return wrap(() => client.listGitHubAppRepositories(id));
		},
	);

	server.tool(
		"coolify_list_github_app_branches",
		"List branches for a repository accessible by a GitHub App",
		{
			id: schemas.numericId.describe("ID of the GitHub App"),
			owner: z.string().min(1).describe("Repository owner (user or organization)"),
			repo: z.string().min(1).describe("Repository name"),
		},
		async ({ id, owner, repo }) => {
			return wrap(() => client.listGitHubAppBranches(id, owner, repo));
		},
	);
}
