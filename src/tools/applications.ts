import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
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
	actions.push({ tool: "coolify_trigger_deploy", args: { uuid }, hint: "Deploy" });
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
}
