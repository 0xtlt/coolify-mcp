import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CoolifyClient } from "../client";
import type { Config } from "../config";
import { isToolAllowed, readonlyError } from "../lib/safety";
import * as schemas from "../lib/schemas";
import { wrap } from "../lib/wrap";
import { toDeploymentSummary } from "../types/api";

export function registerDeploymentTools(server: McpServer, client: CoolifyClient, config: Config) {
	server.tool(
		"coolify_list_deployments",
		"List active deployments (returns summary: deployment_uuid, status, commit, created_at)",
		{
			status: z
				.enum(["queued", "in_progress", "finished", "failed", "cancelled-by-user"])
				.optional()
				.describe("Filter by deployment status"),
			limit: z.number().min(1).max(100).default(20).describe("Max results to return"),
		},
		async ({ status, limit }) => {
			return wrap(async () => {
				let deployments = await client.listDeployments();
				if (status) {
					deployments = deployments.filter((d) => d.status === status);
				}
				return deployments.slice(0, limit).map(toDeploymentSummary);
			});
		},
	);

	server.tool(
		"coolify_get_deployment",
		"Get detailed information about a specific deployment",
		{ uuid: schemas.uuid },
		async ({ uuid }) => {
			return wrap(() => client.getDeployment(uuid));
		},
	);

	if (isToolAllowed("coolify_trigger_deploy", config)) {
		server.tool(
			"coolify_trigger_deploy",
			"[WRITE] Trigger a new deployment for a resource (application, service, or database)",
			{
				uuid: schemas.uuid.describe("UUID of the resource to deploy"),
				force: z.boolean().default(false).describe("Force rebuild even if no changes"),
			},
			async ({ uuid, force }) => {
				if (!isToolAllowed("coolify_trigger_deploy", config))
					return readonlyError("coolify_trigger_deploy");
				return wrap(async () => {
					const result = await client.triggerDeploy(uuid, force);
					const deployments = result.deployments ?? [];
					const summary = deployments
						.map((d) => `${d.resource_uuid}: ${d.message} (deployment: ${d.deployment_uuid})`)
						.join("\n");
					return summary || `Deployment triggered for ${uuid}.`;
				});
			},
		);
	}

	if (isToolAllowed("coolify_cancel_deployment", config)) {
		server.tool(
			"coolify_cancel_deployment",
			"[WRITE] Cancel a running or queued deployment",
			{ uuid: schemas.uuid.describe("UUID of the deployment to cancel") },
			async ({ uuid }) => {
				if (!isToolAllowed("coolify_cancel_deployment", config))
					return readonlyError("coolify_cancel_deployment");
				return wrap(async () => {
					const result = await client.cancelDeployment(uuid);
					return result.message || `Deployment ${uuid} cancelled`;
				});
			},
		);
	}
}
