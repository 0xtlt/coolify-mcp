import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CoolifyClient } from "../client";
import type { Config } from "../config";
import { previewDomainFields } from "../lib/api-schemas";
import { checkConfirmation, isToolAllowed, readonlyError } from "../lib/safety";
import * as schemas from "../lib/schemas";
import { wrap } from "../lib/wrap";

export function registerPreviewTools(server: McpServer, client: CoolifyClient, config: Config) {
	const preview = {
		uuid: schemas.uuid.describe("UUID of the parent application"),
		pull_request_id: schemas.numericId.describe("Pull request number of the preview"),
	};

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
