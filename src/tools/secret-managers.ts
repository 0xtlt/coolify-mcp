import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CoolifyClient } from "../client";
import type { Config } from "../config";
import { integrationTokenFields, secretManagerLinkFields } from "../lib/api-schemas";
import { isToolAllowed, readonlyError } from "../lib/safety";
import * as schemas from "../lib/schemas";
import { wrap } from "../lib/wrap";

export function registerSecretManagerTools(
	server: McpServer,
	client: CoolifyClient,
	config: Config,
) {
	if (isToolAllowed("coolify_create_integration_token", config)) {
		server.tool(
			"coolify_create_integration_token",
			"[WRITE] Store a Doppler, Infisical, or HashiCorp Vault token for the team (Coolify v4.4+). Coolify validates the token against the provider before saving it.",
			integrationTokenFields,
			async (fields) => {
				if (!isToolAllowed("coolify_create_integration_token", config))
					return readonlyError("coolify_create_integration_token");
				return wrap(async () => {
					const result = await client.createIntegrationToken(fields);
					return { message: "Integration token created", uuid: result.uuid };
				});
			},
		);
	}

	if (isToolAllowed("coolify_update_application_secret_manager", config)) {
		server.tool(
			"coolify_update_application_secret_manager",
			"[WRITE] Link an application to a secret manager so {{vault.KEY}} references resolve on deploy (Coolify v4.4+). settings: Doppler service account needs project+config; Infisical needs project_id+environment; Vault needs mount+path.",
			{ uuid: schemas.uuid.describe("UUID of the application"), ...secretManagerLinkFields },
			async ({ uuid, ...fields }) => {
				if (!isToolAllowed("coolify_update_application_secret_manager", config))
					return readonlyError("coolify_update_application_secret_manager");
				return wrap(() => client.updateApplicationSecretManager(uuid, fields));
			},
		);
	}
}
