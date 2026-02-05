import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CoolifyClient } from "../client";
import { CoolifyApiError, NetworkError } from "../lib/errors";

function formatError(error: unknown): string {
	if (error instanceof CoolifyApiError) {
		return error.toUserMessage();
	}
	if (error instanceof NetworkError) {
		return `Network error: ${error.message}`;
	}
	if (error instanceof Error) {
		return `Error: ${error.message}`;
	}
	return `Unknown error: ${String(error)}`;
}

export function registerApplicationTools(server: McpServer, client: CoolifyClient) {
	// List all applications
	server.tool(
		"coolify_list_applications",
		"List all applications managed by Coolify with their status and details",
		{},
		async () => {
			try {
				const apps = await client.listApplications();
				return {
					content: [{ type: "text", text: JSON.stringify(apps, null, 2) }],
				};
			} catch (error) {
				return {
					content: [{ type: "text", text: formatError(error) }],
					isError: true,
				};
			}
		},
	);

	// Get single application details
	server.tool(
		"coolify_get_application",
		"Get detailed information about a specific Coolify application",
		{
			uuid: z.string().describe("UUID of the application"),
		},
		async ({ uuid }) => {
			try {
				const app = await client.getApplication(uuid);
				return {
					content: [{ type: "text", text: JSON.stringify(app, null, 2) }],
				};
			} catch (error) {
				return {
					content: [{ type: "text", text: formatError(error) }],
					isError: true,
				};
			}
		},
	);

	// Start application
	server.tool(
		"coolify_start_application",
		"Start a stopped Coolify application",
		{
			uuid: z.string().describe("UUID of the application to start"),
		},
		async ({ uuid }) => {
			try {
				await client.startApplication(uuid);
				return {
					content: [{ type: "text", text: `Application ${uuid} start command sent` }],
				};
			} catch (error) {
				return {
					content: [{ type: "text", text: formatError(error) }],
					isError: true,
				};
			}
		},
	);

	// Stop application
	server.tool(
		"coolify_stop_application",
		"Stop a running Coolify application",
		{
			uuid: z.string().describe("UUID of the application to stop"),
		},
		async ({ uuid }) => {
			try {
				await client.stopApplication(uuid);
				return {
					content: [{ type: "text", text: `Application ${uuid} stop command sent` }],
				};
			} catch (error) {
				return {
					content: [{ type: "text", text: formatError(error) }],
					isError: true,
				};
			}
		},
	);

	// Restart application
	server.tool(
		"coolify_restart_application",
		"Restart a Coolify application (stop and start)",
		{
			uuid: z.string().describe("UUID of the application to restart"),
		},
		async ({ uuid }) => {
			try {
				await client.restartApplication(uuid);
				return {
					content: [{ type: "text", text: `Application ${uuid} restart command sent` }],
				};
			} catch (error) {
				return {
					content: [{ type: "text", text: formatError(error) }],
					isError: true,
				};
			}
		},
	);
}
