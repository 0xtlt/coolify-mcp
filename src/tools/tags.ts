import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CoolifyClient, CoolifyResourceKind } from "../client";
import type { Config } from "../config";
import { registerApiTool } from "../lib/register-tool";
import * as schemas from "../lib/schemas";

const resourceKind = z
	.enum(["applications", "databases", "services"])
	.describe("Resource collection: applications, databases, or services");

export function registerTagTools(server: McpServer, client: CoolifyClient, config: Config) {
	registerApiTool(
		server,
		config,
		"coolify_list_tags",
		"List tags for the current team",
		{},
		async () => client.listTags(),
	);

	registerApiTool<{ name: string }>(
		server,
		config,
		"coolify_create_tag",
		"[WRITE] Create a team tag (name must be at least 2 characters)",
		{ name: z.string().min(2).max(255).describe("Tag name") },
		async ({ name }) => client.createTag(name),
	);

	registerApiTool<{ uuid: string; name: string }>(
		server,
		config,
		"coolify_update_tag",
		"[WRITE] Rename a team tag",
		{
			uuid: schemas.uuid.describe("Tag UUID"),
			name: z.string().min(2).max(255).describe("New tag name"),
		},
		async ({ uuid, name }) => client.updateTag(uuid, name),
	);

	registerApiTool<{ uuid: string; confirm?: boolean }>(
		server,
		config,
		"coolify_delete_tag",
		"[DESTRUCTIVE] Delete a team tag",
		{ uuid: schemas.uuid.describe("Tag UUID"), confirm: schemas.confirm },
		async ({ uuid }) => client.deleteTag(uuid),
	);

	registerApiTool<{ resource: CoolifyResourceKind; uuid: string }>(
		server,
		config,
		"coolify_list_resource_tags",
		"List tags attached to an application, database, or service",
		{ resource: resourceKind, uuid: schemas.uuid },
		async ({ resource, uuid }) => client.listResourceTags(resource, uuid),
	);

	registerApiTool<{
		resource: CoolifyResourceKind;
		uuid: string;
		tag_name?: string;
		tag_names?: string[];
	}>(
		server,
		config,
		"coolify_add_resource_tags",
		"[WRITE] Attach a tag name or a list of tag names to an application, database, or service. Provide tag_name or tag_names, not both.",
		{
			resource: resourceKind,
			uuid: schemas.uuid,
			tag_name: z.string().min(2).optional().describe("Single tag name"),
			tag_names: z.array(z.string().min(2)).optional().describe("Tag names to attach"),
		},
		async ({ resource, uuid, tag_name, tag_names }) => {
			if (tag_name && tag_names) {
				throw new Error("Provide tag_name or tag_names, not both.");
			}
			if (!tag_name && !tag_names) {
				throw new Error("tag_name or tag_names is required.");
			}
			return client.addResourceTags(resource, uuid, { tag_name, tag_names });
		},
	);

	registerApiTool<{
		resource: CoolifyResourceKind;
		uuid: string;
		tag_uuid: string;
		confirm?: boolean;
	}>(
		server,
		config,
		"coolify_remove_resource_tag",
		"[DESTRUCTIVE] Detach a tag from an application, database, or service",
		{
			resource: resourceKind,
			uuid: schemas.uuid,
			tag_uuid: schemas.uuid.describe("UUID of the tag to detach"),
			confirm: schemas.confirm,
		},
		async ({ resource, uuid, tag_uuid }) => client.removeResourceTag(resource, uuid, tag_uuid),
	);
}
