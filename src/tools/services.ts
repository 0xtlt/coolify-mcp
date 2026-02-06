import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CoolifyClient } from "../client";
import type { Config } from "../config";
import { checkConfirmation, isToolAllowed, readonlyError } from "../lib/safety";
import * as schemas from "../lib/schemas";
import { type ResponseAction, wrap, wrapWithActions } from "../lib/wrap";
import type { Service } from "../types/api";
import { toServiceSummary } from "../types/api";

function getServiceActions(uuid: string, status?: string): ResponseAction[] {
	const actions: ResponseAction[] = [];
	if (status === "running" || status?.startsWith("running:")) {
		actions.push(
			{ tool: "coolify_restart_service", args: { uuid }, hint: "Restart" },
			{ tool: "coolify_stop_service", args: { uuid }, hint: "Stop" },
		);
	} else if (status === "exited" || status?.startsWith("exited:")) {
		actions.push({ tool: "coolify_start_service", args: { uuid }, hint: "Start" });
	}
	actions.push(
		{ tool: "coolify_trigger_deploy", args: { uuid }, hint: "Deploy" },
		{ tool: "coolify_delete_service", args: { uuid }, hint: "Delete" },
	);
	return actions;
}

export function registerServiceTools(server: McpServer, client: CoolifyClient, config: Config) {
	server.tool(
		"coolify_list_services",
		"List all services managed by Coolify (returns summary: uuid, name, status, service_type)",
		{},
		async () => {
			return wrap(async () => {
				const services = await client.listServices();
				return services.map(toServiceSummary);
			});
		},
	);

	server.tool(
		"coolify_get_service",
		"Get detailed information about a specific Coolify service",
		{ uuid: schemas.uuid },
		async ({ uuid }) => {
			return wrapWithActions(
				() => client.getService(uuid),
				(svc: Service) => getServiceActions(uuid, svc.status),
			);
		},
	);

	// Write: start
	if (isToolAllowed("coolify_start_service", config)) {
		server.tool(
			"coolify_start_service",
			"[WRITE] Start a stopped Coolify service",
			{ uuid: schemas.uuid },
			async ({ uuid }) => {
				if (!isToolAllowed("coolify_start_service", config))
					return readonlyError("coolify_start_service");
				return wrap(async () => {
					const result = await client.startService(uuid);
					return result.message || `Service ${uuid} start command sent`;
				});
			},
		);
	}

	// Destructive: stop
	if (isToolAllowed("coolify_stop_service", config)) {
		server.tool(
			"coolify_stop_service",
			"[DESTRUCTIVE] Stop a running Coolify service. Causes downtime.",
			{ uuid: schemas.uuid, confirm: schemas.confirm },
			async ({ uuid, confirm }) => {
				if (!isToolAllowed("coolify_stop_service", config))
					return readonlyError("coolify_stop_service");
				const check = checkConfirmation("coolify_stop_service", { uuid, confirm }, config);
				if (!check.proceed) return check.response!;
				return wrap(async () => {
					const result = await client.stopService(uuid);
					return result.message || `Service ${uuid} stop command sent`;
				});
			},
		);
	}

	// Destructive: restart
	if (isToolAllowed("coolify_restart_service", config)) {
		server.tool(
			"coolify_restart_service",
			"[DESTRUCTIVE] Restart a Coolify service. Causes brief downtime.",
			{ uuid: schemas.uuid, confirm: schemas.confirm },
			async ({ uuid, confirm }) => {
				if (!isToolAllowed("coolify_restart_service", config))
					return readonlyError("coolify_restart_service");
				const check = checkConfirmation("coolify_restart_service", { uuid, confirm }, config);
				if (!check.proceed) return check.response!;
				return wrap(async () => {
					const result = await client.restartService(uuid);
					return result.message || `Service ${uuid} restart command sent`;
				});
			},
		);
	}

	// Destructive: delete
	if (isToolAllowed("coolify_delete_service", config)) {
		server.tool(
			"coolify_delete_service",
			"[DESTRUCTIVE] Permanently delete a Coolify service",
			{
				uuid: schemas.uuid,
				confirm: schemas.confirm,
				delete_volumes: z.boolean().default(true).describe("Also delete associated volumes"),
				docker_cleanup: z.boolean().default(true).describe("Clean up Docker resources"),
			},
			async ({ uuid, confirm, delete_volumes, docker_cleanup }) => {
				if (!isToolAllowed("coolify_delete_service", config))
					return readonlyError("coolify_delete_service");
				const check = checkConfirmation("coolify_delete_service", { uuid, confirm }, config);
				if (!check.proceed) return check.response!;
				return wrap(async () => {
					const result = await client.deleteService(uuid, { delete_volumes, docker_cleanup });
					return result.message || `Service ${uuid} deleted`;
				});
			},
		);
	}
}
