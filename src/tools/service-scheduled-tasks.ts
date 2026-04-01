import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CoolifyClient } from "../client";
import type { Config } from "../config";
import { checkConfirmation, isToolAllowed, readonlyError } from "../lib/safety";
import * as schemas from "../lib/schemas";
import { wrap } from "../lib/wrap";
import { toScheduledTaskSummary } from "../types/api";

export function registerServiceScheduledTaskTools(
	server: McpServer,
	client: CoolifyClient,
	config: Config,
) {
	server.tool(
		"coolify_list_service_scheduled_tasks",
		"List all scheduled tasks for a Coolify service",
		{ uuid: schemas.uuid.describe("UUID of the service") },
		async ({ uuid }) => {
			return wrap(async () => {
				const tasks = await client.listServiceScheduledTasks(uuid);
				return tasks.map(toScheduledTaskSummary);
			});
		},
	);

	if (isToolAllowed("coolify_create_service_scheduled_task", config)) {
		server.tool(
			"coolify_create_service_scheduled_task",
			"[WRITE] Create a scheduled task for a Coolify service",
			{
				uuid: schemas.uuid.describe("UUID of the service"),
				name: z.string().min(1).describe("Task name"),
				command: z.string().min(1).describe("Command to execute"),
				frequency: z.string().min(1).describe("Cron frequency (e.g. '* * * * *')"),
				container: z.string().optional().describe("Container name to run in"),
				timeout: z.number().int().optional().describe("Timeout in seconds"),
				enabled: z.boolean().optional().describe("Whether the task is enabled"),
			},
			async ({ uuid, name, command, frequency, container, timeout, enabled }) => {
				if (!isToolAllowed("coolify_create_service_scheduled_task", config))
					return readonlyError("coolify_create_service_scheduled_task");
				return wrap(async () => {
					const result = await client.createServiceScheduledTask(uuid, {
						name,
						command,
						frequency,
						container,
						timeout,
						enabled,
					});
					return { message: `Scheduled task '${name}' created`, uuid: result.uuid };
				});
			},
		);
	}

	if (isToolAllowed("coolify_update_service_scheduled_task", config)) {
		server.tool(
			"coolify_update_service_scheduled_task",
			"[WRITE] Update a scheduled task for a Coolify service",
			{
				uuid: schemas.uuid.describe("UUID of the service"),
				task_uuid: schemas.uuid.describe("UUID of the scheduled task"),
				name: z.string().optional().describe("Task name"),
				command: z.string().optional().describe("Command to execute"),
				frequency: z.string().optional().describe("Cron frequency"),
				container: z.string().optional().describe("Container name"),
				timeout: z.number().int().optional().describe("Timeout in seconds"),
				enabled: z.boolean().optional().describe("Whether the task is enabled"),
			},
			async ({ uuid, task_uuid, ...fields }) => {
				if (!isToolAllowed("coolify_update_service_scheduled_task", config))
					return readonlyError("coolify_update_service_scheduled_task");
				return wrap(async () => {
					const data: Record<string, unknown> = {};
					for (const [k, v] of Object.entries(fields)) {
						if (v !== undefined) data[k] = v;
					}
					await client.updateServiceScheduledTask(uuid, task_uuid, data);
					return `Scheduled task ${task_uuid} updated`;
				});
			},
		);
	}

	if (isToolAllowed("coolify_delete_service_scheduled_task", config)) {
		server.tool(
			"coolify_delete_service_scheduled_task",
			"[DESTRUCTIVE] Delete a scheduled task from a Coolify service",
			{
				uuid: schemas.uuid.describe("UUID of the service"),
				task_uuid: schemas.uuid.describe("UUID of the scheduled task"),
				confirm: schemas.confirm,
			},
			async ({ uuid, task_uuid, confirm }) => {
				if (!isToolAllowed("coolify_delete_service_scheduled_task", config))
					return readonlyError("coolify_delete_service_scheduled_task");
				const check = checkConfirmation(
					"coolify_delete_service_scheduled_task",
					{ uuid, task_uuid, confirm },
					config,
				);
				if (!check.proceed) return check.response!;
				return wrap(async () => {
					const result = await client.deleteServiceScheduledTask(uuid, task_uuid);
					return result.message || `Scheduled task ${task_uuid} deleted`;
				});
			},
		);
	}

	server.tool(
		"coolify_list_service_scheduled_task_executions",
		"List executions of a scheduled task for a Coolify service",
		{
			uuid: schemas.uuid.describe("UUID of the service"),
			task_uuid: schemas.uuid.describe("UUID of the scheduled task"),
		},
		async ({ uuid, task_uuid }) => {
			return wrap(() => client.listServiceScheduledTaskExecutions(uuid, task_uuid));
		},
	);
}
