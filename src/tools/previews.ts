import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CoolifyClient } from "../client";
import type { Config } from "../config";
import { previewDeployFields, previewDomainFields, pullRequestId } from "../lib/api-schemas";
import { checkConfirmation, isToolAllowed, readonlyError } from "../lib/safety";
import * as schemas from "../lib/schemas";
import { wrap } from "../lib/wrap";
import { toApplicationPreviewSummary } from "../types/api";

export function registerPreviewTools(server: McpServer, client: CoolifyClient, config: Config) {
	const preview = {
		uuid: schemas.uuid.describe("UUID of the parent application"),
		pull_request_id: pullRequestId,
	};

	server.tool(
		"coolify_list_application_previews",
		"List preview deployments of an application (Coolify v4.4+; returns summary: uuid, pull_request_id, status, domains, git_type)",
		{ uuid: preview.uuid },
		async ({ uuid }) =>
			wrap(async () => {
				const previews = await client.listApplicationPreviews(uuid);
				return previews.map(toApplicationPreviewSummary);
			}),
	);

	server.tool(
		"coolify_get_application_preview",
		"Get one preview deployment of an application by pull request number (Coolify v4.4+)",
		preview,
		async ({ uuid, pull_request_id }) =>
			wrap(() => client.getApplicationPreview(uuid, pull_request_id)),
	);

	if (isToolAllowed("coolify_deploy_application_preview", config)) {
		server.tool(
			"coolify_deploy_application_preview",
			"[WRITE] Open or redeploy the preview of a pull request (Coolify v4.4+; token needs deploy). Git apps take git_type/commit, Docker Image apps take docker_tag.",
			{ ...preview, ...previewDeployFields },
			async ({ uuid, ...fields }) => {
				if (!isToolAllowed("coolify_deploy_application_preview", config))
					return readonlyError("coolify_deploy_application_preview");
				return wrap(() => client.deployApplicationPreview(uuid, fields));
			},
		);
	}

	if (isToolAllowed("coolify_update_application_preview", config)) {
		server.tool(
			"coolify_update_application_preview",
			"[WRITE] Replace preview deployment domains (Coolify v4.3.23). Provide domains for a regular app or docker_compose_domains for a Compose app.",
			{ ...preview, ...previewDomainFields },
			async ({ uuid, pull_request_id, ...fields }) => {
				if (!isToolAllowed("coolify_update_application_preview", config))
					return readonlyError("coolify_update_application_preview");
				return wrap(() => client.updateApplicationPreview(uuid, pull_request_id, fields));
			},
		);
	}

	if (isToolAllowed("coolify_delete_application_preview", config)) {
		server.tool(
			"coolify_delete_application_preview",
			"[DESTRUCTIVE] Delete a preview deployment, cancel its deployments, and remove its containers, volumes, and networks.",
			{ ...preview, confirm: schemas.confirm },
			async ({ uuid, pull_request_id, confirm }) => {
				if (!isToolAllowed("coolify_delete_application_preview", config))
					return readonlyError("coolify_delete_application_preview");
				const check = checkConfirmation(
					"coolify_delete_application_preview",
					{ uuid, pull_request_id, confirm },
					config,
				);
				if (!check.proceed && check.response) return check.response;
				return wrap(() => client.deleteApplicationPreview(uuid, pull_request_id));
			},
		);
	}
}
