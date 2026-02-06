import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerPrompts(server: McpServer) {
	server.prompt(
		"troubleshoot_deployment",
		"Step-by-step guide to debug a failed deployment",
		{ deployment_uuid: z.string().optional().describe("UUID of the failed deployment") },
		async ({ deployment_uuid }) => {
			const steps = deployment_uuid
				? `I need to troubleshoot deployment ${deployment_uuid}. Please:
1. Call coolify_get_deployment with uuid "${deployment_uuid}" to get deployment details
2. If the deployment has an application, call coolify_get_logs with the application uuid
3. Check the deployment status and error messages
4. Look for common issues: build failures, port conflicts, resource limits, environment variable issues
5. Suggest fixes based on the error patterns found`
				: `I need to troubleshoot a failed deployment. Please:
1. Call coolify_list_deployments with status "failed" to find recent failures
2. Pick the most recent failed deployment and call coolify_get_deployment
3. Get logs for the associated application with coolify_get_logs
4. Analyze error patterns and suggest fixes`;

			return {
				messages: [{ role: "user" as const, content: { type: "text" as const, text: steps } }],
			};
		},
	);

	server.prompt(
		"infrastructure_overview",
		"Get a complete overview of all Coolify infrastructure",
		{},
		async () => ({
			messages: [
				{
					role: "user" as const,
					content: {
						type: "text" as const,
						text: `Please give me a complete infrastructure overview. Run these in sequence:
1. coolify_list_servers - show all servers
2. coolify_list_applications - show all apps with status
3. coolify_list_databases - show all databases with status
4. coolify_list_services - show all services with status
5. coolify_list_deployments (limit 5) - show recent deployment activity
6. Summarize: total resources, how many running vs stopped, any failures or warnings`,
					},
				},
			],
		}),
	);

	server.prompt(
		"deploy_application",
		"Guided workflow to deploy an application",
		{ application_uuid: z.string().optional().describe("UUID of the application to deploy") },
		async ({ application_uuid }) => {
			const text = application_uuid
				? `I want to deploy application ${application_uuid}. Please:
1. Call coolify_get_application with uuid "${application_uuid}" to verify its current state
2. Check if it's running - if stopped, ask if I want to start it first
3. Call coolify_trigger_deploy with uuid "${application_uuid}"
4. After triggering, call coolify_list_deployments to track the deployment status
5. Report the deployment result`
				: `I want to deploy an application. Please:
1. Call coolify_list_applications to show available apps
2. Ask me which one to deploy
3. Call coolify_get_application to verify its state
4. Call coolify_trigger_deploy
5. Monitor and report results`;

			return {
				messages: [{ role: "user" as const, content: { type: "text" as const, text } }],
			};
		},
	);

	server.prompt(
		"setup_new_application",
		"Guided workflow to create and configure a new application",
		{},
		async () => ({
			messages: [
				{
					role: "user" as const,
					content: {
						type: "text" as const,
						text: `I want to set up a new application on Coolify. Please guide me through:
1. Call coolify_list_servers to show available servers
2. Call coolify_list_projects to show available projects (or offer to create one)
3. Ask me about my application source:
   - Public git repo?
   - Private GitHub repo (via GitHub App)?
   - Private repo via deploy key?
   - Dockerfile (inline)?
   - Docker image from a registry?
4. Gather the required info based on source type
5. Call coolify_create_application with the collected parameters
6. Ask if I want to set up environment variables (coolify_create_env)
7. Ask if I want to trigger an initial deploy (coolify_trigger_deploy)
8. Confirm the setup is complete and show the application details`,
					},
				},
			],
		}),
	);
}
