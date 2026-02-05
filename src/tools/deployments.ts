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

export function registerDeploymentTools(server: McpServer, client: CoolifyClient) {
	// List deployments
	server.tool(
		"coolify_list_deployments",
		"List all deployments, optionally filtered by status",
		{
			status: z
				.enum(["queued", "in_progress", "finished", "failed", "cancelled"])
				.optional()
				.describe("Filter by deployment status"),
			limit: z.number().min(1).max(100).default(20).describe("Max results to return"),
		},
		async ({ status, limit }) => {
			try {
				let deployments = await client.listDeployments();

				// Apply status filter
				if (status) {
					deployments = deployments.filter((d) => d.status === status);
				}

				// Apply limit
				deployments = deployments.slice(0, limit);

				return {
					content: [{ type: "text", text: JSON.stringify(deployments, null, 2) }],
				};
			} catch (error) {
				return {
					content: [{ type: "text", text: formatError(error) }],
					isError: true,
				};
			}
		},
	);

	// Get deployment details
	server.tool(
		"coolify_get_deployment",
		"Get detailed information about a specific deployment",
		{
			uuid: z.string().describe("UUID of the deployment"),
		},
		async ({ uuid }) => {
			try {
				const deployment = await client.getDeployment(uuid);
				return {
					content: [{ type: "text", text: JSON.stringify(deployment, null, 2) }],
				};
			} catch (error) {
				return {
					content: [{ type: "text", text: formatError(error) }],
					isError: true,
				};
			}
		},
	);

	// Trigger deployment
	server.tool(
		"coolify_trigger_deploy",
		"Trigger a new deployment for an application",
		{
			uuid: z.string().describe("UUID of the application to deploy"),
			force: z.boolean().default(false).describe("Force rebuild even if no changes"),
		},
		async ({ uuid, force }) => {
			try {
				const result = await client.triggerDeploy(uuid, force);
				return {
					content: [
						{
							type: "text",
							text: `Deployment triggered for ${uuid}. ${result.message}${result.deployment_uuid ? ` Deployment UUID: ${result.deployment_uuid}` : ""}`,
						},
					],
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
