import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CoolifyClient } from "../client";
import type { Config } from "../config";
import { checkConfirmation, isToolAllowed, readonlyError } from "../lib/safety";
import * as schemas from "../lib/schemas";
import { type ResponseAction, wrap, wrapWithActions } from "../lib/wrap";
import type { Application } from "../types/api";
import { toApplicationSummary } from "../types/api";

function getApplicationActions(uuid: string, status?: string): ResponseAction[] {
	const actions: ResponseAction[] = [
		{ tool: "coolify_get_logs", args: { uuid }, hint: "View logs" },
	];
	if (status === "running" || status?.startsWith("running:")) {
		actions.push(
			{ tool: "coolify_restart_application", args: { uuid }, hint: "Restart" },
			{ tool: "coolify_stop_application", args: { uuid }, hint: "Stop" },
		);
	} else if (status === "exited" || status?.startsWith("exited:")) {
		actions.push({ tool: "coolify_start_application", args: { uuid }, hint: "Start" });
	}
	actions.push(
		{ tool: "coolify_update_application", args: { uuid }, hint: "Update config" },
		{ tool: "coolify_trigger_deploy", args: { uuid }, hint: "Deploy" },
		{ tool: "coolify_delete_application", args: { uuid }, hint: "Delete" },
	);
	return actions;
}

export function registerApplicationTools(server: McpServer, client: CoolifyClient, config: Config) {
	server.tool(
		"coolify_list_applications",
		"List all applications managed by Coolify (returns summary: uuid, name, status, fqdn)",
		{},
		async () => {
			return wrap(async () => {
				const apps = await client.listApplications();
				return apps.map(toApplicationSummary);
			});
		},
	);

	server.tool(
		"coolify_get_application",
		"Get detailed information about a specific Coolify application",
		{ uuid: schemas.uuid },
		async ({ uuid }) => {
			return wrapWithActions(
				() => client.getApplication(uuid),
				(app: Application) => getApplicationActions(uuid, app.status),
			);
		},
	);

	// Write tool: start
	if (isToolAllowed("coolify_start_application", config)) {
		server.tool(
			"coolify_start_application",
			"[WRITE] Start a stopped Coolify application",
			{ uuid: schemas.uuid },
			async ({ uuid }) => {
				if (!isToolAllowed("coolify_start_application", config))
					return readonlyError("coolify_start_application");
				return wrap(async () => {
					const result = await client.startApplication(uuid);
					return result.message || `Application ${uuid} start command sent`;
				});
			},
		);
	}

	// Destructive: stop
	if (isToolAllowed("coolify_stop_application", config)) {
		server.tool(
			"coolify_stop_application",
			"[DESTRUCTIVE] Stop a running Coolify application. Causes downtime.",
			{ uuid: schemas.uuid, confirm: schemas.confirm },
			async ({ uuid, confirm }) => {
				if (!isToolAllowed("coolify_stop_application", config))
					return readonlyError("coolify_stop_application");
				const check = checkConfirmation("coolify_stop_application", { uuid, confirm }, config);
				if (!check.proceed) return check.response!;
				return wrap(async () => {
					const result = await client.stopApplication(uuid);
					return result.message || `Application ${uuid} stop command sent`;
				});
			},
		);
	}

	// Destructive: restart
	if (isToolAllowed("coolify_restart_application", config)) {
		server.tool(
			"coolify_restart_application",
			"[DESTRUCTIVE] Restart a Coolify application. Causes brief downtime.",
			{ uuid: schemas.uuid, confirm: schemas.confirm },
			async ({ uuid, confirm }) => {
				if (!isToolAllowed("coolify_restart_application", config))
					return readonlyError("coolify_restart_application");
				const check = checkConfirmation("coolify_restart_application", { uuid, confirm }, config);
				if (!check.proceed) return check.response!;
				return wrap(async () => {
					const result = await client.restartApplication(uuid);
					return result.message || `Application ${uuid} restart command sent`;
				});
			},
		);
	}

	// Write: update
	if (isToolAllowed("coolify_update_application", config)) {
		server.tool(
			"coolify_update_application",
			"[WRITE] Update configuration of a Coolify application",
			{
				uuid: schemas.uuid,
				name: z.string().optional().describe("Application name"),
				description: z.string().optional().describe("Application description"),
				fqdn: z.string().optional().describe("Fully qualified domain name(s)"),
				git_repository: z.string().optional().describe("Git repository URL"),
				git_branch: z.string().optional().describe("Git branch"),
				build_pack: z
					.string()
					.optional()
					.describe("Build pack (dockerfile, nixpacks, static, dockercompose, dockerimage)"),
				install_command: z.string().optional().describe("Install command (e.g. npm install)"),
				build_command: z.string().optional().describe("Build command (e.g. npm run build)"),
				start_command: z.string().optional().describe("Start command (e.g. npm start)"),
				ports_exposes: z.string().optional().describe("Exposed ports (e.g. 3000,8080)"),
				base_directory: z.string().optional().describe("Base directory in repo"),
				publish_directory: z.string().optional().describe("Publish directory for static builds"),
				is_static: z.boolean().optional().describe("Serve as static site"),
				is_auto_deploy_enabled: z.boolean().optional().describe("Auto-deploy on push"),
				instant_deploy: z.boolean().optional().describe("Deploy immediately after update"),
				custom_fields: z
					.record(z.string(), z.unknown())
					.optional()
					.describe("Additional fields not listed above (advanced)"),
			},
			async ({ uuid, custom_fields, ...fields }) => {
				if (!isToolAllowed("coolify_update_application", config))
					return readonlyError("coolify_update_application");
				return wrap(async () => {
					const data: Record<string, unknown> = {};
					for (const [k, v] of Object.entries(fields)) {
						if (v !== undefined) data[k] = v;
					}
					if (custom_fields) Object.assign(data, custom_fields);
					await client.updateApplication(uuid, data);
					return `Application ${uuid} updated`;
				});
			},
		);
	}

	// Write: create
	if (isToolAllowed("coolify_create_application", config)) {
		server.tool(
			"coolify_create_application",
			"[WRITE] Create a new Coolify application from various sources",
			{
				source_type: z
					.enum(["public", "private-github-app", "private-deploy-key", "dockerfile", "dockerimage"])
					.describe("Source type for the application"),
				server_uuid: schemas.serverUuid,
				project_uuid: schemas.projectUuid,
				environment_name: schemas.environmentName,
				name: z.string().optional().describe("Application name"),
				description: z.string().optional().describe("Application description"),
				fqdn: z.string().optional().describe("Fully qualified domain name(s)"),
				git_repository: z
					.string()
					.optional()
					.describe(
						"Git repository URL (required for public/private-github-app/private-deploy-key)",
					),
				git_branch: z.string().optional().describe("Git branch (default: main)"),
				build_pack: z
					.string()
					.optional()
					.describe("Build pack (dockerfile, nixpacks, static, dockercompose, dockerimage)"),
				ports_exposes: z
					.string()
					.optional()
					.describe("Exposed ports, comma-separated (e.g. '3000,8080')"),
				instant_deploy: schemas.instantDeploy,
				github_app_uuid: z
					.string()
					.optional()
					.describe("GitHub App UUID (required for private-github-app)"),
				deploy_key_id: z
					.number()
					.optional()
					.describe("Deploy key ID (required for private-deploy-key)"),
				dockerfile: z
					.string()
					.optional()
					.describe("Inline Dockerfile content (for dockerfile source_type)"),
				docker_registry_image_name: z
					.string()
					.optional()
					.describe("Docker image name (required for dockerimage, e.g. 'nginx')"),
				docker_registry_image_tag: z
					.string()
					.optional()
					.describe("Docker image tag (default: 'latest')"),
				custom_fields: schemas.customFields,
			},
			async ({
				source_type,
				server_uuid,
				project_uuid,
				environment_name,
				custom_fields,
				...fields
			}) => {
				if (!isToolAllowed("coolify_create_application", config))
					return readonlyError("coolify_create_application");
				return wrap(async () => {
					const data: Record<string, unknown> = {
						server_uuid,
						project_uuid,
						environment_name,
					};
					for (const [k, v] of Object.entries(fields)) {
						if (v !== undefined) data[k] = v;
					}
					if (custom_fields) Object.assign(data, custom_fields);
					const result = await client.createApplication(source_type, data);
					return { message: "Application created", uuid: result.uuid };
				});
			},
		);
	}

	// Destructive: delete
	if (isToolAllowed("coolify_delete_application", config)) {
		server.tool(
			"coolify_delete_application",
			"[DESTRUCTIVE] Permanently delete a Coolify application",
			{
				uuid: schemas.uuid,
				confirm: schemas.confirm,
				delete_volumes: z.boolean().default(true).describe("Also delete associated volumes"),
				docker_cleanup: z.boolean().default(true).describe("Clean up Docker resources"),
			},
			async ({ uuid, confirm, delete_volumes, docker_cleanup }) => {
				if (!isToolAllowed("coolify_delete_application", config))
					return readonlyError("coolify_delete_application");
				const check = checkConfirmation("coolify_delete_application", { uuid, confirm }, config);
				if (!check.proceed) return check.response!;
				return wrap(async () => {
					const result = await client.deleteApplication(uuid, {
						delete_volumes,
						docker_cleanup,
					});
					return result.message || `Application ${uuid} deleted`;
				});
			},
		);
	}
}
