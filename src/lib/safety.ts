import type { Config } from "../config";
import { errorResponse, type ToolResponse } from "./wrap";

export type OperationLevel = "read" | "write" | "destructive";

export interface ToolMeta {
	level: OperationLevel;
	dangerWarning?: string;
}

const TOOL_METADATA: Record<string, ToolMeta> = {
	// Applications - read
	coolify_list_applications: { level: "read" },
	coolify_get_application: { level: "read" },
	// Applications - write
	coolify_start_application: { level: "write" },
	coolify_update_application: { level: "write" },
	// Applications - destructive
	coolify_delete_application: {
		level: "destructive",
		dangerWarning: "Permanently deletes the application and optionally its volumes.",
	},
	coolify_stop_application: {
		level: "destructive",
		dangerWarning: "Stops the application, making it unavailable until restarted.",
	},
	coolify_restart_application: {
		level: "destructive",
		dangerWarning: "Restarts the application, causing brief downtime.",
	},
	// Deployments - read
	coolify_list_deployments: { level: "read" },
	coolify_get_deployment: { level: "read" },
	// Deployments - write
	coolify_trigger_deploy: { level: "write" },
	coolify_cancel_deployment: { level: "write" },
	// Logs - read
	coolify_get_logs: { level: "read" },
	// Databases - read
	coolify_list_databases: { level: "read" },
	coolify_get_database: { level: "read" },
	coolify_list_database_backups: { level: "read" },
	// Databases - write
	coolify_start_database: { level: "write" },
	coolify_update_database: { level: "write" },
	// Databases - destructive
	coolify_stop_database: {
		level: "destructive",
		dangerWarning: "Stops the database, making it unavailable until restarted.",
	},
	coolify_restart_database: {
		level: "destructive",
		dangerWarning: "Restarts the database, causing brief downtime.",
	},
	coolify_delete_database: {
		level: "destructive",
		dangerWarning: "Permanently deletes the database and optionally its volumes.",
	},
	// Services - read
	coolify_list_services: { level: "read" },
	coolify_get_service: { level: "read" },
	// Services - write
	coolify_start_service: { level: "write" },
	// Services - destructive
	coolify_stop_service: {
		level: "destructive",
		dangerWarning: "Stops the service, making it unavailable until restarted.",
	},
	coolify_restart_service: {
		level: "destructive",
		dangerWarning: "Restarts the service, causing brief downtime.",
	},
	coolify_delete_service: {
		level: "destructive",
		dangerWarning: "Permanently deletes the service and optionally its volumes.",
	},
	// Servers - read
	coolify_list_servers: { level: "read" },
	coolify_get_server: { level: "read" },
	coolify_validate_server: { level: "read" },
	coolify_get_server_resources: { level: "read" },
	coolify_get_server_domains: { level: "read" },
	// Projects & Environments - read
	coolify_list_projects: { level: "read" },
	coolify_get_project: { level: "read" },
	coolify_list_environments: { level: "read" },
	coolify_get_environment: { level: "read" },
	// Environment variables - read
	coolify_list_envs: { level: "read" },
	// Environment variables - write
	coolify_create_env: { level: "write" },
	coolify_update_envs_bulk: { level: "write" },
	// Environment variables - destructive
	coolify_delete_env: {
		level: "destructive",
		dangerWarning: "Permanently deletes the environment variable.",
	},
	// Phase 4: Private Keys - read
	coolify_list_private_keys: { level: "read" },
	coolify_get_private_key: { level: "read" },
	// Phase 4: Private Keys - write
	coolify_create_private_key: { level: "write" },
	coolify_update_private_key: { level: "write" },
	// Phase 4: Private Keys - destructive
	coolify_delete_private_key: {
		level: "destructive",
		dangerWarning: "Permanently deletes the SSH private key. Blocked if in use.",
	},
	// Phase 4: Servers - write
	coolify_create_server: { level: "write" },
	coolify_update_server: { level: "write" },
	// Phase 4: Servers - destructive
	coolify_delete_server: {
		level: "destructive",
		dangerWarning: "Permanently deletes the server and stops all its resources.",
	},
	// Phase 4: Environments - write
	coolify_create_environment: { level: "write" },
	// Phase 4: Environments - destructive
	coolify_delete_environment: {
		level: "destructive",
		dangerWarning: "Permanently deletes the environment. Must be empty.",
	},
	// Phase 4: Service env vars - read
	coolify_list_service_envs: { level: "read" },
	// Phase 4: Service env vars - write
	coolify_create_service_env: { level: "write" },
	coolify_update_service_envs_bulk: { level: "write" },
	// Phase 4: Service env vars - destructive
	coolify_delete_service_env: {
		level: "destructive",
		dangerWarning: "Permanently deletes the service environment variable.",
	},
	// Phase 3: Create operations - write
	coolify_create_application: { level: "write" },
	coolify_create_database: { level: "write" },
	coolify_create_service: { level: "write" },
	coolify_update_service: { level: "write" },
	coolify_create_project: { level: "write" },
	coolify_update_project: { level: "write" },
	// Phase 3: Projects - destructive
	coolify_delete_project: {
		level: "destructive",
		dangerWarning: "Permanently deletes the project and all its environments.",
	},
	// Phase 3: System - read
	coolify_get_version: { level: "read" },
	coolify_healthcheck: { level: "read" },
	// Phase 3: Teams - read
	coolify_list_teams: { level: "read" },
	coolify_get_current_team: { level: "read" },
	coolify_get_team_members: { level: "read" },
};

export function getToolMeta(name: string): ToolMeta | undefined {
	return TOOL_METADATA[name];
}

export function isToolAllowed(toolName: string, config: Config): boolean {
	const meta = TOOL_METADATA[toolName];
	if (!meta) return true;
	if (config.readonly && meta.level !== "read") return false;
	return true;
}

export function checkConfirmation(
	toolName: string,
	args: Record<string, unknown>,
	config: Config,
): { proceed: boolean; response?: ToolResponse } {
	const meta = TOOL_METADATA[toolName];
	if (!config.requireConfirm || meta?.level !== "destructive") {
		return { proceed: true };
	}
	if (args.confirm === true) {
		return { proceed: true };
	}
	return {
		proceed: false,
		response: errorResponse(
			JSON.stringify(
				{
					confirmation_required: true,
					action: toolName,
					warning: meta.dangerWarning || "This is a destructive operation.",
					message: "Call again with confirm: true to proceed.",
					example: { ...args, confirm: true },
				},
				null,
				2,
			),
		),
	};
}

export function readonlyError(toolName: string): ToolResponse {
	return errorResponse(
		`Operation '${toolName}' blocked: server is in read-only mode (COOLIFY_READONLY=true)`,
	);
}
