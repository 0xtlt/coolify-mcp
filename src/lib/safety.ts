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
	// Applications - destructive
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
	// Logs - read
	coolify_get_logs: { level: "read" },
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
