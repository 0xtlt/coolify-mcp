import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CoolifyClient } from "../client";
import type { Config } from "../config";
import { instanceEmailFields } from "../lib/api-schemas";
import { isToolAllowed, readonlyError } from "../lib/safety";
import { wrap } from "../lib/wrap";

export function registerSettingsTools(server: McpServer, client: CoolifyClient, config: Config) {
	server.tool(
		"coolify_get_instance_email_settings",
		"Get instance-wide SMTP/Resend settings (Coolify v4.3.23). Requires a root-team admin/owner token; secrets require read:sensitive or root ability.",
		{},
		async () => wrap(() => client.getInstanceEmailSettings()),
	);

	if (isToolAllowed("coolify_update_instance_email_settings", config)) {
		server.tool(
			"coolify_update_instance_email_settings",
			"[WRITE] Update instance-wide SMTP/Resend settings (Coolify v4.3.23). Requires a root-team admin/owner token with write:sensitive ability. Null clears a field.",
			instanceEmailFields,
			async (fields) => {
				if (!isToolAllowed("coolify_update_instance_email_settings", config))
					return readonlyError("coolify_update_instance_email_settings");
				return wrap(() => client.updateInstanceEmailSettings(fields));
			},
		);
	}
}
