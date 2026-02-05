import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
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

export function registerResources(server: McpServer, client: CoolifyClient) {
	// List of all applications
	server.resource("coolify://applications", "List of all Coolify applications", async () => {
		try {
			const apps = await client.listApplications();
			return {
				contents: [
					{
						uri: "coolify://applications",
						mimeType: "application/json",
						text: JSON.stringify(apps, null, 2),
					},
				],
			};
		} catch (error) {
			return {
				contents: [
					{
						uri: "coolify://applications",
						mimeType: "text/plain",
						text: formatError(error),
					},
				],
			};
		}
	});

	// List of all deployments
	server.resource("coolify://deployments", "List of all Coolify deployments", async () => {
		try {
			const deployments = await client.listDeployments();
			return {
				contents: [
					{
						uri: "coolify://deployments",
						mimeType: "application/json",
						text: JSON.stringify(deployments, null, 2),
					},
				],
			};
		} catch (error) {
			return {
				contents: [
					{
						uri: "coolify://deployments",
						mimeType: "text/plain",
						text: formatError(error),
					},
				],
			};
		}
	});

	// List of all servers
	server.resource("coolify://servers", "List of all Coolify servers", async () => {
		try {
			const servers = await client.listServers();
			return {
				contents: [
					{
						uri: "coolify://servers",
						mimeType: "application/json",
						text: JSON.stringify(servers, null, 2),
					},
				],
			};
		} catch (error) {
			return {
				contents: [
					{
						uri: "coolify://servers",
						mimeType: "text/plain",
						text: formatError(error),
					},
				],
			};
		}
	});
}
