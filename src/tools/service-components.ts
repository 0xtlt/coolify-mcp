import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CoolifyClient } from "../client";
import type { Config } from "../config";
import { definedRecord, registerApiTool } from "../lib/register-tool";
import * as schemas from "../lib/schemas";

export function registerServiceComponentTools(
	server: McpServer,
	client: CoolifyClient,
	config: Config,
) {
	registerApiTool<{ uuid: string }>(
		server,
		config,
		"coolify_list_service_applications",
		"List compose applications inside a one-click service",
		{ uuid: schemas.uuid.describe("Service UUID") },
		async ({ uuid }) => client.listServiceApplications(uuid),
	);

	registerApiTool<{ uuid: string; app_uuid: string }>(
		server,
		config,
		"coolify_get_service_application",
		"Get a compose application inside a service",
		{
			uuid: schemas.uuid.describe("Service UUID"),
			app_uuid: schemas.uuid.describe("Service application UUID"),
		},
		async ({ uuid, app_uuid }) => client.getServiceApplication(uuid, app_uuid),
	);

	registerApiTool<Record<string, unknown> & { uuid: string; app_uuid: string }>(
		server,
		config,
		"coolify_update_service_application",
		"[WRITE] Update a compose service application (domains, image, HTTPS, gzip, restart limit)",
		{
			uuid: schemas.uuid.describe("Service UUID"),
			app_uuid: schemas.uuid.describe("Service application UUID"),
			url: z.string().optional().describe("Domains"),
			noindex_domains: z.array(z.string()).nullable().optional(),
			human_name: z.string().max(255).nullable().optional(),
			description: z.string().nullable().optional(),
			image: z.string().nullable().optional(),
			exclude_from_status: z.boolean().optional(),
			is_log_drain_enabled: z.boolean().optional(),
			is_gzip_enabled: z.boolean().optional(),
			is_stripprefix_enabled: z.boolean().optional(),
			is_force_https_enabled: z.boolean().optional(),
			max_restart_count: z.number().int().min(0).optional(),
		},
		async ({ uuid, app_uuid, ...rest }) => {
			const data = definedRecord(rest);
			if (Object.keys(data).length === 0) throw new Error("Provide at least one field to update.");
			return client.updateServiceApplication(uuid, app_uuid, data);
		},
	);

	registerApiTool<{ uuid: string; app_uuid: string; lines?: number }>(
		server,
		config,
		"coolify_get_service_application_logs",
		"Get container logs for a compose service application. The container must be running. Swarm is not supported.",
		{
			uuid: schemas.uuid.describe("Service UUID"),
			app_uuid: schemas.uuid.describe("Service application UUID"),
			lines: z.number().int().min(1).max(1000).optional().describe("Number of log lines"),
		},
		async ({ uuid, app_uuid, lines }) =>
			client.getServiceApplicationLogs(uuid, app_uuid, lines ?? 100),
	);

	registerApiTool<{ uuid: string; app_uuid: string; force?: boolean; latest?: boolean }>(
		server,
		config,
		"coolify_start_service_application",
		"[WRITE] Start or redeploy one compose service application (docker compose up, no dependencies)",
		{
			uuid: schemas.uuid.describe("Service UUID"),
			app_uuid: schemas.uuid.describe("Service application UUID"),
			force: z.boolean().optional().describe("Force rebuild"),
			latest: z.boolean().optional().describe("Pull the latest image"),
		},
		async ({ uuid, app_uuid, force, latest }) =>
			client.startServiceApplication(uuid, app_uuid, { force, latest }),
	);

	registerApiTool<{ uuid: string; app_uuid: string; confirm?: boolean }>(
		server,
		config,
		"coolify_restart_service_application",
		"[DESTRUCTIVE] Restart one compose service application",
		{
			uuid: schemas.uuid.describe("Service UUID"),
			app_uuid: schemas.uuid.describe("Service application UUID"),
			confirm: schemas.confirm,
		},
		async ({ uuid, app_uuid }) => client.restartServiceApplication(uuid, app_uuid),
	);

	registerApiTool<{ uuid: string; app_uuid: string; confirm?: boolean }>(
		server,
		config,
		"coolify_stop_service_application",
		"[DESTRUCTIVE] Stop one compose service application",
		{
			uuid: schemas.uuid.describe("Service UUID"),
			app_uuid: schemas.uuid.describe("Service application UUID"),
			confirm: schemas.confirm,
		},
		async ({ uuid, app_uuid }) => client.stopServiceApplication(uuid, app_uuid),
	);

	registerApiTool<{ uuid: string }>(
		server,
		config,
		"coolify_list_service_databases",
		"List compose databases inside a one-click service",
		{ uuid: schemas.uuid.describe("Service UUID") },
		async ({ uuid }) => client.listServiceDatabases(uuid),
	);

	registerApiTool<{ uuid: string; database_uuid: string }>(
		server,
		config,
		"coolify_get_service_database",
		"Get a compose database inside a service",
		{
			uuid: schemas.uuid.describe("Service UUID"),
			database_uuid: schemas.uuid.describe("Service database UUID"),
		},
		async ({ uuid, database_uuid }) => client.getServiceDatabase(uuid, database_uuid),
	);

	registerApiTool<Record<string, unknown> & { uuid: string; database_uuid: string }>(
		server,
		config,
		"coolify_update_service_database",
		"[WRITE] Update a compose service database (image, public port, log drain)",
		{
			uuid: schemas.uuid.describe("Service UUID"),
			database_uuid: schemas.uuid.describe("Service database UUID"),
			human_name: z.string().max(255).nullable().optional(),
			description: z.string().nullable().optional(),
			image: z.string().optional(),
			exclude_from_status: z.boolean().optional(),
			is_log_drain_enabled: z.boolean().optional(),
			is_public: z.boolean().optional(),
			public_port: z.number().int().min(1).max(65535).nullable().optional(),
			public_port_timeout: z.number().int().min(1).nullable().optional(),
		},
		async ({ uuid, database_uuid, ...rest }) => {
			const data = definedRecord(rest);
			if (Object.keys(data).length === 0) throw new Error("Provide at least one field to update.");
			return client.updateServiceDatabase(uuid, database_uuid, data);
		},
	);

	registerApiTool<{ uuid: string; database_uuid: string; lines?: number }>(
		server,
		config,
		"coolify_get_service_database_logs",
		"Get container logs for a compose service database",
		{
			uuid: schemas.uuid.describe("Service UUID"),
			database_uuid: schemas.uuid.describe("Service database UUID"),
			lines: z.number().int().min(1).max(1000).optional(),
		},
		async ({ uuid, database_uuid, lines }) =>
			client.getServiceDatabaseLogs(uuid, database_uuid, lines ?? 100),
	);

	registerApiTool<{ uuid: string; database_uuid: string; force?: boolean; latest?: boolean }>(
		server,
		config,
		"coolify_start_service_database",
		"[WRITE] Start or redeploy one compose service database",
		{
			uuid: schemas.uuid.describe("Service UUID"),
			database_uuid: schemas.uuid.describe("Service database UUID"),
			force: z.boolean().optional(),
			latest: z.boolean().optional(),
		},
		async ({ uuid, database_uuid, force, latest }) =>
			client.startServiceDatabase(uuid, database_uuid, { force, latest }),
	);

	registerApiTool<{ uuid: string; database_uuid: string; confirm?: boolean }>(
		server,
		config,
		"coolify_restart_service_database",
		"[DESTRUCTIVE] Restart one compose service database",
		{
			uuid: schemas.uuid.describe("Service UUID"),
			database_uuid: schemas.uuid.describe("Service database UUID"),
			confirm: schemas.confirm,
		},
		async ({ uuid, database_uuid }) => client.restartServiceDatabase(uuid, database_uuid),
	);

	registerApiTool<{ uuid: string; database_uuid: string; confirm?: boolean }>(
		server,
		config,
		"coolify_stop_service_database",
		"[DESTRUCTIVE] Stop one compose service database",
		{
			uuid: schemas.uuid.describe("Service UUID"),
			database_uuid: schemas.uuid.describe("Service database UUID"),
			confirm: schemas.confirm,
		},
		async ({ uuid, database_uuid }) => client.stopServiceDatabase(uuid, database_uuid),
	);
}
