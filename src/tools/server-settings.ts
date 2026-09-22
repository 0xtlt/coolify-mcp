import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CoolifyClient } from "../client";
import type { Config } from "../config";
import { definedRecord, registerApiTool } from "../lib/register-tool";
import * as schemas from "../lib/schemas";

export function registerServerSettingsTools(
	server: McpServer,
	client: CoolifyClient,
	config: Config,
) {
	registerApiTool<{ uuid: string }>(
		server,
		config,
		"coolify_get_docker_cleanup",
		"Get Docker cleanup settings for a server",
		{ uuid: schemas.uuid.describe("Server UUID") },
		async ({ uuid }) => client.getDockerCleanup(uuid),
	);

	registerApiTool<Record<string, unknown> & { uuid: string }>(
		server,
		config,
		"coolify_update_docker_cleanup",
		"[WRITE] Update Docker cleanup schedule and retention for a server. docker_cleanup_frequency is a cron expression.",
		{
			uuid: schemas.uuid.describe("Server UUID"),
			docker_cleanup_frequency: z.string().optional().describe("Cron expression"),
			docker_cleanup_threshold: z.number().int().min(1).max(99).optional(),
			force_docker_cleanup: z.boolean().optional(),
			delete_unused_volumes: z.boolean().optional(),
			delete_unused_networks: z.boolean().optional(),
			disable_application_image_retention: z.boolean().optional(),
		},
		async ({ uuid, ...rest }) => {
			const data = definedRecord(rest);
			if (Object.keys(data).length === 0) throw new Error("Provide at least one field to update.");
			return client.updateDockerCleanup(uuid, data);
		},
	);

	registerApiTool<{
		uuid: string;
		delete_unused_volumes?: boolean;
		delete_unused_networks?: boolean;
		confirm?: boolean;
	}>(
		server,
		config,
		"coolify_run_docker_cleanup",
		"[DESTRUCTIVE] Run Docker cleanup on a server now. This deletes unused images and, when requested, unused volumes and networks.",
		{
			uuid: schemas.uuid.describe("Server UUID"),
			delete_unused_volumes: z.boolean().optional(),
			delete_unused_networks: z.boolean().optional(),
			confirm: schemas.confirm,
		},
		async ({ uuid, delete_unused_volumes, delete_unused_networks }) =>
			client.runDockerCleanup(uuid, { delete_unused_volumes, delete_unused_networks }),
	);

	registerApiTool<{ uuid: string }>(
		server,
		config,
		"coolify_list_docker_cleanup_executions",
		"List Docker cleanup executions for a server",
		{ uuid: schemas.uuid.describe("Server UUID") },
		async ({ uuid }) => client.listDockerCleanupExecutions(uuid),
	);

	registerApiTool<{ uuid: string }>(
		server,
		config,
		"coolify_get_log_drains",
		"Get log drain settings for a server",
		{ uuid: schemas.uuid.describe("Server UUID") },
		async ({ uuid }) => client.getLogDrains(uuid),
	);

	registerApiTool<Record<string, unknown> & { uuid: string }>(
		server,
		config,
		"coolify_update_log_drains",
		"[WRITE] Update New Relic, Axiom, or custom log drain settings for a server",
		{
			uuid: schemas.uuid.describe("Server UUID"),
			is_logdrain_newrelic_enabled: z.boolean().optional(),
			logdrain_newrelic_license_key: z.string().nullable().optional(),
			logdrain_newrelic_base_uri: z.string().nullable().optional(),
			is_logdrain_axiom_enabled: z.boolean().optional(),
			logdrain_axiom_dataset_name: z.string().nullable().optional(),
			logdrain_axiom_api_key: z.string().nullable().optional(),
			is_logdrain_custom_enabled: z.boolean().optional(),
			logdrain_custom_config: z.string().nullable().optional(),
			logdrain_custom_config_parser: z.string().nullable().optional(),
		},
		async ({ uuid, ...rest }) => {
			const data = definedRecord(rest);
			if (Object.keys(data).length === 0) throw new Error("Provide at least one field to update.");
			return client.updateLogDrains(uuid, data);
		},
	);

	registerApiTool<{ uuid: string }>(
		server,
		config,
		"coolify_get_sentinel",
		"Get Sentinel metrics settings for a server",
		{ uuid: schemas.uuid.describe("Server UUID") },
		async ({ uuid }) => client.getSentinel(uuid),
	);

	registerApiTool<Record<string, unknown> & { uuid: string }>(
		server,
		config,
		"coolify_update_sentinel",
		"[WRITE] Update Sentinel metrics settings for a server",
		{
			uuid: schemas.uuid.describe("Server UUID"),
			is_metrics_enabled: z.boolean().optional(),
			is_sentinel_debug_enabled: z.boolean().optional(),
			sentinel_token: z.string().max(500).optional(),
			sentinel_metrics_refresh_rate_seconds: z.number().int().min(1).optional(),
			sentinel_metrics_history_days: z.number().int().min(1).optional(),
			sentinel_push_interval_seconds: z.number().int().min(10).optional(),
			sentinel_custom_url: z.string().nullable().optional(),
		},
		async ({ uuid, ...rest }) => {
			const data = definedRecord(rest);
			if (Object.keys(data).length === 0) throw new Error("Provide at least one field to update.");
			return client.updateSentinel(uuid, data);
		},
	);

	registerApiTool<{ uuid: string }>(
		server,
		config,
		"coolify_get_cloudflare_tunnel",
		"Get Cloudflare Tunnel settings for a server",
		{ uuid: schemas.uuid.describe("Server UUID") },
		async ({ uuid }) => client.getCloudflareTunnel(uuid),
	);

	registerApiTool<{ uuid: string; is_cloudflare_tunnel: boolean }>(
		server,
		config,
		"coolify_update_cloudflare_tunnel",
		"[WRITE] Enable or disable Cloudflare Tunnel mode on a server (not supported on localhost)",
		{
			uuid: schemas.uuid.describe("Server UUID"),
			is_cloudflare_tunnel: z.boolean().describe("Whether the server IP is a Cloudflare Tunnel"),
		},
		async ({ uuid, is_cloudflare_tunnel }) =>
			client.updateCloudflareTunnel(uuid, is_cloudflare_tunnel),
	);

	registerApiTool<{ uuid: string }>(
		server,
		config,
		"coolify_enable_cloudflare_tunnel",
		"[WRITE] Enable the managed Cloudflare Tunnel on a server (POST /servers/{uuid}/cloudflare-tunnel/enable)",
		{ uuid: schemas.uuid.describe("Server UUID") },
		async ({ uuid }) => client.enableCloudflareTunnel(uuid),
	);

	registerApiTool<{ uuid: string; confirm?: boolean }>(
		server,
		config,
		"coolify_disable_cloudflare_tunnel",
		"[DESTRUCTIVE] Disable the managed Cloudflare Tunnel on a server. Public routing through the tunnel stops.",
		{ uuid: schemas.uuid.describe("Server UUID"), confirm: schemas.confirm },
		async ({ uuid }) => client.disableCloudflareTunnel(uuid),
	);

	registerApiTool<{ uuid: string }>(
		server,
		config,
		"coolify_get_server_proxy",
		"Get proxy type, status, redirect settings, and configuration for a server",
		{ uuid: schemas.uuid.describe("Server UUID") },
		async ({ uuid }) => client.getServerProxy(uuid),
	);

	registerApiTool<Record<string, unknown> & { uuid: string }>(
		server,
		config,
		"coolify_update_server_proxy",
		"[WRITE] Update proxy redirect settings or proxy type (traefik, caddy, nginx, none)",
		{
			uuid: schemas.uuid.describe("Server UUID"),
			redirect_enabled: z.boolean().optional(),
			redirect_url: z.string().nullable().optional(),
			generate_exact_labels: z.boolean().optional(),
			proxy_type: z.enum(["traefik", "caddy", "nginx", "none"]).optional(),
		},
		async ({ uuid, ...rest }) => {
			const data = definedRecord(rest);
			if (Object.keys(data).length === 0) throw new Error("Provide at least one field to update.");
			return client.updateServerProxy(uuid, data);
		},
	);

	registerApiTool<{ uuid: string; configuration: string }>(
		server,
		config,
		"coolify_save_server_proxy_configuration",
		"[WRITE] Replace the server proxy configuration file (PUT /servers/{uuid}/proxy/configuration)",
		{
			uuid: schemas.uuid.describe("Server UUID"),
			configuration: z.string().min(1).describe("Full proxy configuration"),
		},
		async ({ uuid, configuration }) => client.saveServerProxyConfiguration(uuid, configuration),
	);

	registerApiTool<{ uuid: string; confirm?: boolean }>(
		server,
		config,
		"coolify_restart_server_proxy",
		"[DESTRUCTIVE] Restart the server proxy. Routed applications are briefly unavailable.",
		{ uuid: schemas.uuid.describe("Server UUID"), confirm: schemas.confirm },
		async ({ uuid }) => client.restartServerProxy(uuid),
	);
}
