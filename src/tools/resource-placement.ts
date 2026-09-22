import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CoolifyClient, CoolifyResourceKind } from "../client";
import type { Config } from "../config";
import { registerApiTool } from "../lib/register-tool";
import * as schemas from "../lib/schemas";

const resourceKind = z
	.enum(["applications", "databases", "services"])
	.describe("Resource collection: applications, databases, or services");

const composeDomain = z.object({
	name: z.string().min(1).describe("Compose service name"),
	domain: z.string().describe("Domain for that service"),
	redirect: z.enum(["www", "non-www", "both"]).nullable().optional(),
});

export function registerResourcePlacementTools(
	server: McpServer,
	client: CoolifyClient,
	config: Config,
) {
	registerApiTool<{ resource: CoolifyResourceKind; uuid: string; environment_uuid: string }>(
		server,
		config,
		"coolify_move_resource",
		"[WRITE] Move an application, database, or service into another environment owned by the team (POST /{resource}/{uuid}/move)",
		{
			resource: resourceKind,
			uuid: schemas.uuid,
			environment_uuid: schemas.uuid.describe("Target environment UUID"),
		},
		async ({ resource, uuid, environment_uuid }) =>
			client.moveResource(resource, uuid, environment_uuid),
	);

	registerApiTool<{
		resource: CoolifyResourceKind;
		uuid: string;
		destination_uuid: string;
		name?: string;
		clone_volumes?: boolean;
	}>(
		server,
		config,
		"coolify_clone_resource",
		"[WRITE] Clone an application, database, or service onto a destination owned by the team",
		{
			resource: resourceKind,
			uuid: schemas.uuid,
			destination_uuid: schemas.uuid.describe("Target destination UUID"),
			name: z.string().max(255).optional().describe("Name for the clone"),
			clone_volumes: z.boolean().optional().describe("Copy persistent volumes"),
		},
		async ({ resource, uuid, destination_uuid, name, clone_volumes }) =>
			client.cloneResource(resource, uuid, { destination_uuid, name, clone_volumes }),
	);

	registerApiTool<{
		resource: CoolifyResourceKind;
		uuid: string;
		destination_uuid: string;
		migrate_volumes?: boolean;
		confirm?: boolean;
	}>(
		server,
		config,
		"coolify_migrate_resource",
		"[DESTRUCTIVE] Migrate an application, database, or service to another destination. Stops the resource and can transfer volumes. Coolify v4.3.23 only serves this route when the instance is in dev mode; production instances return 404.",
		{
			resource: resourceKind,
			uuid: schemas.uuid,
			destination_uuid: schemas.uuid.describe("Target destination UUID"),
			migrate_volumes: z
				.boolean()
				.optional()
				.describe("Transfer persistent volume data (default true)"),
			confirm: schemas.confirm,
		},
		async ({ resource, uuid, destination_uuid, migrate_volumes }) =>
			client.migrateResource(resource, uuid, { destination_uuid, migrate_volumes }),
	);

	registerApiTool<{ uuid: string }>(
		server,
		config,
		"coolify_list_rollback_images",
		"List local Docker image tags available for rolling back an application",
		{ uuid: schemas.uuid.describe("Application UUID") },
		async ({ uuid }) => client.listRollbackImages(uuid),
	);

	registerApiTool<{ uuid: string; commit: string; confirm?: boolean }>(
		server,
		config,
		"coolify_rollback_application",
		"[DESTRUCTIVE] Roll an application back to a previous image commit and redeploy it (requires deploy ability)",
		{
			uuid: schemas.uuid.describe("Application UUID"),
			commit: z.string().min(1).describe("Image tag / commit to roll back to"),
			confirm: schemas.confirm,
		},
		async ({ uuid, commit }) => client.rollbackApplication(uuid, commit),
	);

	registerApiTool<{
		uuid: string;
		pull_request_id: number;
		domains?: string;
		docker_compose_domains?: Array<{
			name: string;
			domain: string;
			redirect?: "www" | "non-www" | "both" | null;
		}>;
		force_domain_override?: boolean;
	}>(
		server,
		config,
		"coolify_update_preview",
		"[WRITE] Update a preview deployment's domains (PATCH /applications/{uuid}/previews/{pull_request_id}). Non-compose apps require domains. Compose apps require docker_compose_domains and must omit domains.",
		{
			uuid: schemas.uuid.describe("Application UUID"),
			pull_request_id: z.number().int().positive().describe("Pull request id"),
			domains: z.string().optional().describe("Domains for a non-compose application"),
			docker_compose_domains: z
				.array(composeDomain)
				.optional()
				.describe("Per-service domains for a Docker Compose application"),
			force_domain_override: z
				.boolean()
				.optional()
				.describe("Override domains that are already in use"),
		},
		async (args) => {
			const data: Record<string, unknown> = {};
			if (args.domains !== undefined) data.domains = args.domains;
			if (args.docker_compose_domains !== undefined) {
				data.docker_compose_domains = args.docker_compose_domains;
			}
			if (args.force_domain_override !== undefined) {
				data.force_domain_override = args.force_domain_override;
			}
			if (Object.keys(data).length === 0) {
				throw new Error("Provide domains or docker_compose_domains.");
			}
			return client.updatePreview(args.uuid, args.pull_request_id, data);
		},
	);

	registerApiTool<{ uuid: string; pull_request_id: number; confirm?: boolean }>(
		server,
		config,
		"coolify_delete_preview",
		"[DESTRUCTIVE] Delete a preview deployment for a pull request. Cancels active deployments and removes the preview containers.",
		{
			uuid: schemas.uuid.describe("Application UUID"),
			pull_request_id: z.number().int().positive().describe("Pull request id"),
			confirm: schemas.confirm,
		},
		async ({ uuid, pull_request_id }) => client.deletePreview(uuid, pull_request_id),
	);
}
