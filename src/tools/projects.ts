import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CoolifyClient } from "../client";
import type { Config } from "../config";
import { checkConfirmation, isToolAllowed, readonlyError } from "../lib/safety";
import * as schemas from "../lib/schemas";
import { type ResponseAction, wrap, wrapWithActions } from "../lib/wrap";
import type { Project } from "../types/api";
import { toEnvironmentSummary, toProjectSummary } from "../types/api";

function getProjectActions(uuid: string): ResponseAction[] {
	return [
		{ tool: "coolify_list_environments", args: { project_uuid: uuid }, hint: "List environments" },
		{
			tool: "coolify_create_environment",
			args: { project_uuid: uuid },
			hint: "Create environment",
		},
	];
}

export function registerProjectTools(server: McpServer, client: CoolifyClient, config: Config) {
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

	// Write: create project
	if (isToolAllowed("coolify_create_project", config)) {
		server.tool(
			"coolify_create_project",
			"[WRITE] Create a new Coolify project",
			{
				name: z.string().min(1).describe("Project name"),
				description: z.string().optional().describe("Project description"),
			},
			async ({ name, description }) => {
				if (!isToolAllowed("coolify_create_project", config))
					return readonlyError("coolify_create_project");
				return wrap(async () => {
					const result = await client.createProject({ name, description });
					return { message: `Project created`, uuid: result.uuid };
				});
			},
		);
	}

	// Write: update project
	if (isToolAllowed("coolify_update_project", config)) {
		server.tool(
			"coolify_update_project",
			"[WRITE] Update a Coolify project",
			{
				uuid: schemas.uuid,
				name: z.string().optional().describe("Project name"),
				description: z.string().optional().describe("Project description"),
			},
			async ({ uuid, ...fields }) => {
				if (!isToolAllowed("coolify_update_project", config))
					return readonlyError("coolify_update_project");
				return wrap(async () => {
					const data: Record<string, unknown> = {};
					for (const [k, v] of Object.entries(fields)) {
						if (v !== undefined) data[k] = v;
					}
					await client.updateProject(uuid, data);
					return `Project ${uuid} updated`;
				});
			},
		);
	}

	// Write: create environment
	if (isToolAllowed("coolify_create_environment", config)) {
		server.tool(
			"coolify_create_environment",
			"[WRITE] Create a new environment in a Coolify project",
			{
				project_uuid: schemas.uuid.describe("UUID of the project"),
				name: z.string().min(1).describe("Environment name (e.g. 'staging', 'production')"),
			},
			async ({ project_uuid, name }) => {
				if (!isToolAllowed("coolify_create_environment", config))
					return readonlyError("coolify_create_environment");
				return wrap(async () => {
					const result = await client.createEnvironment(project_uuid, { name });
					return { message: `Environment '${name}' created`, uuid: result.uuid };
				});
			},
		);
	}

	// Destructive: delete environment
	if (isToolAllowed("coolify_delete_environment", config)) {
		server.tool(
			"coolify_delete_environment",
			"[DESTRUCTIVE] Delete an environment from a Coolify project. Environment must be empty.",
			{
				project_uuid: schemas.uuid.describe("UUID of the project"),
				environment_name_or_uuid: z
					.string()
					.min(1)
					.describe("Name or UUID of the environment to delete"),
				confirm: schemas.confirm,
			},
			async ({ project_uuid, environment_name_or_uuid, confirm }) => {
				if (!isToolAllowed("coolify_delete_environment", config))
					return readonlyError("coolify_delete_environment");
				const check = checkConfirmation(
					"coolify_delete_environment",
					{ project_uuid, environment_name_or_uuid, confirm },
					config,
				);
				if (!check.proceed) return check.response!;
				return wrap(async () => {
					const result = await client.deleteEnvironment(project_uuid, environment_name_or_uuid);
					return result.message || "Environment deleted";
				});
			},
		);
	}

	// Destructive: delete project
	if (isToolAllowed("coolify_delete_project", config)) {
		server.tool(
			"coolify_delete_project",
			"[DESTRUCTIVE] Permanently delete a Coolify project and all its environments",
			{
				uuid: schemas.uuid,
				confirm: schemas.confirm,
			},
			async ({ uuid, confirm }) => {
				if (!isToolAllowed("coolify_delete_project", config))
					return readonlyError("coolify_delete_project");
				const check = checkConfirmation("coolify_delete_project", { uuid, confirm }, config);
				if (!check.proceed) return check.response!;
				return wrap(async () => {
					const result = await client.deleteProject(uuid);
					return result.message || `Project ${uuid} deleted`;
				});
			},
		);
	}
}
