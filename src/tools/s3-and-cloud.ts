import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CloudProvider, CoolifyClient } from "../client";
import type { Config } from "../config";
import { definedRecord, registerApiTool } from "../lib/register-tool";
import * as schemas from "../lib/schemas";

const provider = z.enum(["hetzner", "digitalocean", "vultr"]).describe("Cloud provider");

const catalogKind = z
	.string()
	.describe(
		"Catalog kind. Hetzner: locations, server-types, images, ssh-keys, firewalls, networks. Vultr: regions, plans, os, ssh-keys. DigitalOcean: regions, sizes, images, ssh-keys.",
	);

export function registerS3AndCloudTools(server: McpServer, client: CoolifyClient, config: Config) {
	registerApiTool(
		server,
		config,
		"coolify_list_s3_storages",
		"List S3-compatible storages for the current team",
		{},
		async () => client.listS3Storages(),
	);

	registerApiTool<{ uuid: string }>(
		server,
		config,
		"coolify_get_s3_storage",
		"Get an S3 storage by UUID",
		{ uuid: schemas.uuid },
		async ({ uuid }) => client.getS3Storage(uuid),
	);

	registerApiTool<{
		name: string;
		endpoint: string;
		bucket: string;
		region: string;
		key: string;
		secret: string;
		description?: string;
		is_usable?: boolean;
	}>(
		server,
		config,
		"coolify_create_s3_storage",
		"[WRITE] Create an S3-compatible storage",
		{
			name: z.string().min(1).describe("Friendly name"),
			description: z.string().optional(),
			endpoint: z.string().min(1).describe("S3 endpoint URL"),
			bucket: z.string().min(1).describe("Bucket name"),
			region: z.string().min(1),
			key: z.string().min(1).describe("Access key"),
			secret: z.string().min(1).describe("Secret key"),
			is_usable: z.boolean().optional(),
		},
		async (args) => client.createS3Storage(definedRecord(args)),
	);

	registerApiTool<Record<string, unknown> & { uuid: string }>(
		server,
		config,
		"coolify_update_s3_storage",
		"[WRITE] Update an S3 storage. Secret values are replaced when provided.",
		{
			uuid: schemas.uuid,
			name: z.string().optional(),
			description: z.string().nullable().optional(),
			endpoint: z.string().optional(),
			bucket: z.string().optional(),
			region: z.string().optional(),
			key: z.string().optional(),
			secret: z.string().optional(),
			is_usable: z.boolean().optional(),
		},
		async ({ uuid, ...rest }) => {
			const data = definedRecord(rest);
			if (Object.keys(data).length === 0) throw new Error("Provide at least one field to update.");
			return client.updateS3Storage(uuid, data);
		},
	);

	registerApiTool<{ uuid: string; confirm?: boolean }>(
		server,
		config,
		"coolify_delete_s3_storage",
		"[DESTRUCTIVE] Delete an S3 storage",
		{ uuid: schemas.uuid, confirm: schemas.confirm },
		async ({ uuid }) => client.deleteS3Storage(uuid),
	);

	registerApiTool<{ uuid: string }>(
		server,
		config,
		"coolify_validate_s3_storage",
		"[WRITE] Validate connectivity to an S3 storage",
		{ uuid: schemas.uuid },
		async ({ uuid }) => client.validateS3Storage(uuid),
	);

	registerApiTool(
		server,
		config,
		"coolify_list_cloud_tokens",
		"List cloud provider tokens (secrets are omitted)",
		{},
		async () => client.listCloudTokens(),
	);

	registerApiTool<{ uuid: string }>(
		server,
		config,
		"coolify_get_cloud_token",
		"Get a cloud provider token by UUID",
		{ uuid: schemas.uuid },
		async ({ uuid }) => client.getCloudToken(uuid),
	);

	registerApiTool<{ provider: "hetzner" | "digitalocean" | "vultr"; token: string; name: string }>(
		server,
		config,
		"coolify_create_cloud_token",
		"[WRITE] Create a cloud provider token. Coolify validates the token before storing it.",
		{
			provider,
			token: z.string().min(1).describe("Provider API token"),
			name: z.string().min(1).max(255),
		},
		async (args) => client.createCloudToken(args),
	);

	registerApiTool<{ uuid: string; name: string }>(
		server,
		config,
		"coolify_update_cloud_token",
		"[WRITE] Rename a cloud provider token. The token secret itself cannot be changed.",
		{ uuid: schemas.uuid, name: z.string().min(1).max(255) },
		async ({ uuid, name }) => client.updateCloudToken(uuid, name),
	);

	registerApiTool<{ uuid: string; confirm?: boolean }>(
		server,
		config,
		"coolify_delete_cloud_token",
		"[DESTRUCTIVE] Delete a cloud provider token",
		{ uuid: schemas.uuid, confirm: schemas.confirm },
		async ({ uuid }) => client.deleteCloudToken(uuid),
	);

	registerApiTool<{ uuid: string }>(
		server,
		config,
		"coolify_validate_cloud_token",
		"[WRITE] Validate a stored cloud provider token",
		{ uuid: schemas.uuid },
		async ({ uuid }) => client.validateCloudToken(uuid),
	);

	registerApiTool(
		server,
		config,
		"coolify_list_cloud_init_scripts",
		"List cloud-init scripts for the current team",
		{},
		async () => client.listCloudInitScripts(),
	);

	registerApiTool<{ uuid: string }>(
		server,
		config,
		"coolify_get_cloud_init_script",
		"Get a cloud-init script by UUID",
		{ uuid: schemas.uuid },
		async ({ uuid }) => client.getCloudInitScript(uuid),
	);

	registerApiTool<{ name: string; script: string }>(
		server,
		config,
		"coolify_create_cloud_init_script",
		"[WRITE] Create a cloud-init script. script must be valid cloud-init YAML.",
		{
			name: z.string().min(1).max(255),
			script: z.string().min(1).describe("Cloud-init YAML"),
		},
		async (args) => client.createCloudInitScript(args),
	);

	registerApiTool<{ uuid: string; name?: string; script?: string }>(
		server,
		config,
		"coolify_update_cloud_init_script",
		"[WRITE] Update a cloud-init script name and/or YAML",
		{
			uuid: schemas.uuid,
			name: z.string().max(255).optional(),
			script: z.string().optional().describe("Cloud-init YAML"),
		},
		async ({ uuid, name, script }) => {
			if (name === undefined && script === undefined) {
				throw new Error("Provide name or script.");
			}
			return client.updateCloudInitScript(uuid, { name, script });
		},
	);

	registerApiTool<{ uuid: string; confirm?: boolean }>(
		server,
		config,
		"coolify_delete_cloud_init_script",
		"[DESTRUCTIVE] Delete a cloud-init script",
		{ uuid: schemas.uuid, confirm: schemas.confirm },
		async ({ uuid }) => client.deleteCloudInitScript(uuid),
	);

	registerApiTool<{ provider: CloudProvider; kind: string; cloud_provider_token_uuid: string }>(
		server,
		config,
		"coolify_list_cloud_provider_options",
		"List provider catalog options (regions, images, plans, SSH keys, and similar) for a stored cloud token",
		{
			provider,
			kind: catalogKind,
			cloud_provider_token_uuid: schemas.uuid.describe("Cloud provider token UUID"),
		},
		async ({ provider: selected, kind, cloud_provider_token_uuid }) =>
			client.listCloudProviderOptions(selected, kind, cloud_provider_token_uuid),
	);

	registerApiTool<Record<string, unknown>>(
		server,
		config,
		"coolify_create_hetzner_server",
		"[WRITE] Create a Hetzner server and register it in Coolify (POST /servers/hetzner)",
		{
			cloud_provider_token_uuid: schemas.uuid,
			location: z.string().min(1),
			server_type: z.string().min(1),
			image: z.number().int().describe("Hetzner image id"),
			private_key_uuid: schemas.uuid.describe("Coolify private key UUID"),
			name: z.string().max(253).optional(),
			enable_ipv4: z.boolean().optional(),
			enable_ipv6: z.boolean().optional(),
			enable_backups: z.boolean().optional(),
			hetzner_ssh_key_ids: z.array(z.number().int()).optional(),
			hetzner_firewall_ids: z.array(z.number().int()).optional(),
			hetzner_network_ids: z.array(z.number().int()).optional(),
			cloud_init_script: z.string().optional(),
			instant_validate: z.boolean().optional(),
		},
		async (args) => client.createHetznerServer(definedRecord(args)),
	);

	registerApiTool<Record<string, unknown>>(
		server,
		config,
		"coolify_create_vultr_server",
		"[WRITE] Create a Vultr server and register it in Coolify (POST /servers/vultr)",
		{
			cloud_provider_token_uuid: schemas.uuid,
			region: z.string().min(1),
			plan: z.string().min(1),
			os_id: z.number().int().describe("Vultr OS id"),
			private_key_uuid: schemas.uuid,
			name: z.string().max(253).optional(),
			enable_ipv6: z.boolean().optional(),
			disable_public_ipv4: z.boolean().optional(),
			vultr_ssh_key_ids: z.array(z.string()).optional(),
			cloud_init_script: z.string().optional(),
			instant_validate: z.boolean().optional(),
		},
		async (args) => client.createVultrServer(definedRecord(args)),
	);

	registerApiTool<Record<string, unknown>>(
		server,
		config,
		"coolify_create_digitalocean_server",
		"[WRITE] Create a DigitalOcean droplet and register it in Coolify (POST /servers/digitalocean)",
		{
			cloud_provider_token_uuid: schemas.uuid,
			region: z.string().min(1),
			size: z.string().min(1),
			image: z.union([z.string(), z.number()]).describe("DigitalOcean image slug or id"),
			private_key_uuid: schemas.uuid,
			name: z.string().max(253).optional(),
			enable_ipv6: z.boolean().optional(),
			monitoring: z.boolean().optional(),
			digitalocean_ssh_key_ids: z.array(z.number().int()).optional(),
			cloud_init_script: z.string().optional(),
			instant_validate: z.boolean().optional(),
		},
		async (args) => client.createDigitalOceanServer(definedRecord(args)),
	);
}
