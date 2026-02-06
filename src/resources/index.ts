import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CoolifyClient } from "../client";
import { formatError } from "../lib/wrap";
import { toApplicationSummary, toDeploymentSummary, toServerSummary } from "../types/api";

export function registerResources(server: McpServer, client: CoolifyClient) {
	server.resource(
		"coolify://applications",
		"List of all Coolify applications (summary)",
		async () => {
			try {
				const apps = await client.listApplications();
				return {
					contents: [
						{
							uri: "coolify://applications",
							mimeType: "application/json",
							text: JSON.stringify(apps.map(toApplicationSummary), null, 2),
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
		},
	);

	server.resource(
		"coolify://deployments",
		"List of all Coolify deployments (summary)",
		async () => {
			try {
				const deployments = await client.listDeployments();
				return {
					contents: [
						{
							uri: "coolify://deployments",
							mimeType: "application/json",
							text: JSON.stringify(deployments.map(toDeploymentSummary), null, 2),
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
		},
	);

	server.resource("coolify://servers", "List of all Coolify servers (summary)", async () => {
		try {
			const servers = await client.listServers();
			return {
				contents: [
					{
						uri: "coolify://servers",
						mimeType: "application/json",
						text: JSON.stringify(servers.map(toServerSummary), null, 2),
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
