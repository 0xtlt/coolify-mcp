import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CoolifyClient } from "../client";
import type { Config } from "../config";
import { registryHost } from "../lib/api-schemas";
import { checkConfirmation, isToolAllowed, readonlyError } from "../lib/safety";
import * as schemas from "../lib/schemas";
import { wrap } from "../lib/wrap";

export function registerServerRegistryTools(
	server: McpServer,
	client: CoolifyClient,
	config: Config,
) {
	const target = {
		uuid: schemas.uuid.describe("UUID of the server"),
		registry: registryHost,
	};

	server.tool(
		"coolify_list_server_registries",
		"List the Docker registries a server is logged in to and the registries its applications need (Coolify v4.4+; token needs read:sensitive)",
		{ uuid: target.uuid },
		async ({ uuid }) => wrap(() => client.listServerRegistries(uuid)),
	);

	if (isToolAllowed("coolify_login_server_registry", config)) {
		server.tool(
			"coolify_login_server_registry",
			"[WRITE] Log a server in to a Docker registry, or update the login (Coolify v4.4+). Coolify runs docker login on the server and does not store the token.",
			{
				...target,
				username: z
					.string()
					.min(1)
					.max(255)
					.regex(/^\S+$/, "The username must not contain spaces")
					.describe("Registry username"),
				password: z.string().min(1).max(20000).describe("Registry password or access token"),
			},
			async ({ uuid, registry, username, password }) => {
				if (!isToolAllowed("coolify_login_server_registry", config))
					return readonlyError("coolify_login_server_registry");
				return wrap(async () => {
					const result = await client.loginServerRegistry(uuid, { registry, username, password });
					return result.message || `Logged in to ${registry}`;
				});
			},
		);
	}

	if (isToolAllowed("coolify_check_server_registry", config)) {
		server.tool(
			"coolify_check_server_registry",
			"[WRITE] Check that the stored login of a server for a Docker registry still works (Coolify v4.4+). Changes nothing, but the API requires write ability.",
			target,
			async ({ uuid, registry }) => {
				if (!isToolAllowed("coolify_check_server_registry", config))
					return readonlyError("coolify_check_server_registry");
				return wrap(async () => {
					const result = await client.checkServerRegistry(uuid, registry);
					return result.message || `The login for ${registry} works`;
				});
			},
		);
	}

	if (isToolAllowed("coolify_logout_server_registry", config)) {
		server.tool(
			"coolify_logout_server_registry",
			"[DESTRUCTIVE] Log a server out of a Docker registry (Coolify v4.4+). Deployments that pull private images from it will fail.",
			{ ...target, confirm: schemas.confirm },
			async ({ uuid, registry, confirm }) => {
				if (!isToolAllowed("coolify_logout_server_registry", config))
					return readonlyError("coolify_logout_server_registry");
				const check = checkConfirmation(
					"coolify_logout_server_registry",
					{ uuid, registry, confirm },
					config,
				);
				if (!check.proceed && check.response) return check.response;
				return wrap(async () => {
					const result = await client.logoutServerRegistry(uuid, registry);
					return result.message || `Logged out from ${registry}`;
				});
			},
		);
	}
}
