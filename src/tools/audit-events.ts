import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CoolifyClient } from "../client";
import type { Config } from "../config";
import { auditEventFilterFields } from "../lib/api-schemas";
import { wrap } from "../lib/wrap";

export function registerAuditEventTools(server: McpServer, client: CoolifyClient, _config: Config) {
	server.tool(
		"coolify_list_audit_events",
		"List the team audit log, newest first (Coolify v4.4+). Requires a team admin/owner token; actor email, token, metadata, changes, and IP need read:sensitive.",
		auditEventFilterFields,
		async (filter) => wrap(() => client.listAuditEvents(filter)),
	);
}
