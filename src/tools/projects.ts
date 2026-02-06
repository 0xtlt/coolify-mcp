import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CoolifyClient } from "../client";
import type { Config } from "../config";
import * as schemas from "../lib/schemas";
import { type ResponseAction, wrap, wrapWithActions } from "../lib/wrap";
import type { Project } from "../types/api";
import { toEnvironmentSummary, toProjectSummary } from "../types/api";

function getProjectActions(uuid: string): ResponseAction[] {
	return [
		{ tool: "coolify_list_environments", args: { project_uuid: uuid }, hint: "List environments" },
	];
}

export function registerProjectTools(server: McpServer, client: CoolifyClient, _config: Config) {
	server.tool(
		"coolify_list_projects",
		"List all projects in Coolify (returns summary: uuid, name, description)",
		{},
		async () => {
			return wrap(async () => {
				const projects = await client.listProjects();
				return projects.map(toProjectSummary);
			});
		},
	);

	server.tool(
		"coolify_get_project",
		"Get detailed information about a specific Coolify project",
		{ uuid: schemas.uuid },
		async ({ uuid }) => {
			return wrapWithActions(
				() => client.getProject(uuid),
				(_proj: Project) => getProjectActions(uuid),
			);
		},
	);

	server.tool(
		"coolify_list_environments",
		"List all environments in a Coolify project",
		{ project_uuid: schemas.uuid.describe("UUID of the project") },
		async ({ project_uuid }) => {
			return wrap(async () => {
				const envs = await client.listEnvironments(project_uuid);
				return envs.map(toEnvironmentSummary);
			});
		},
	);

	server.tool(
		"coolify_get_environment",
		"Get detailed information about a specific environment in a project",
		{
			project_uuid: schemas.uuid.describe("UUID of the project"),
			environment_name: z.string().min(1).describe("Name or UUID of the environment"),
		},
		async ({ project_uuid, environment_name }) => {
			return wrap(() => client.getEnvironment(project_uuid, environment_name));
		},
	);
}
