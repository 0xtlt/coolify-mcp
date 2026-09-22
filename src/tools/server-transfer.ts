import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CoolifyClient } from "../client";
import type { Config } from "../config";
import { definedRecord, registerApiTool } from "../lib/register-tool";
import * as schemas from "../lib/schemas";

export function registerServerTransferTools(
	server: McpServer,
	client: CoolifyClient,
	config: Config,
) {
	registerApiTool<{ uuid: string; encrypt?: boolean; passphrase?: string }>(
		server,
		config,
		"coolify_export_server",
		"Export a server transfer bundle (GET /servers/{uuid}/export). Requires a token with read:sensitive and an admin or owner role. The bundle includes credentials.",
		{
			uuid: schemas.uuid.describe("Server UUID"),
			encrypt: z.boolean().optional().describe("Return an encrypted envelope"),
			passphrase: z.string().optional().describe("Passphrase used when encrypt is true"),
		},
		async ({ uuid, encrypt, passphrase }) => client.exportServer(uuid, { encrypt, passphrase }),
	);

	registerApiTool<Record<string, unknown>>(
		server,
		config,
		"coolify_import_server",
		"[DESTRUCTIVE] Import a server transfer bundle into this Coolify instance (POST /servers/import)",
		{
			bundle: z.record(z.string(), z.unknown()).describe("Plain or encrypted transfer bundle"),
			passphrase: z.string().optional(),
			dry_run: z.boolean().optional(),
			preserve_uuids: z.boolean().optional(),
			adopt_mode: z.boolean().optional(),
			claim: z.boolean().optional(),
			write_remote: z.boolean().optional(),
			rebind_sentinel: z.boolean().optional(),
			confirm: schemas.confirm,
		},
		async ({ confirm: _confirm, ...rest }) => client.importServer(definedRecord(rest)),
	);

	registerApiTool<Record<string, unknown> & { uuid: string }>(
		server,
		config,
		"coolify_transfer_server",
		"[DESTRUCTIVE] Push a server to another Coolify instance (POST /servers/{uuid}/migrate). Requires read:sensitive. target_url and target_token are required.",
		{
			uuid: schemas.uuid.describe("Server UUID"),
			target_url: z.string().min(1).describe("Target Coolify URL"),
			target_token: z.string().min(1).describe("API token on the target instance"),
			write_remote: z.boolean().optional(),
			rebind_sentinel: z.boolean().optional(),
			preserve_uuids: z.boolean().optional(),
			adopt_mode: z.boolean().optional(),
			confirm: schemas.confirm,
		},
		async ({ uuid, confirm: _confirm, ...rest }) =>
			client.transferServer(uuid, definedRecord(rest)),
	);

	registerApiTool<{
		uuid: string;
		write_remote?: boolean;
		rebind_sentinel?: boolean;
		confirm?: boolean;
	}>(
		server,
		config,
		"coolify_claim_server",
		"[DESTRUCTIVE] Claim an imported server for this instance (POST /servers/{uuid}/claim)",
		{
			uuid: schemas.uuid.describe("Server UUID"),
			write_remote: z.boolean().optional().describe("Write the ownership file over SSH"),
			rebind_sentinel: z.boolean().optional(),
			confirm: schemas.confirm,
		},
		async ({ uuid, write_remote, rebind_sentinel }) =>
			client.claimServer(uuid, definedRecord({ write_remote, rebind_sentinel })),
	);

	registerApiTool<{
		uuid: string;
		export_id?: string;
		target_instance_url?: string;
		confirm?: boolean;
	}>(
		server,
		config,
		"coolify_complete_server_transfer",
		"[DESTRUCTIVE] Mark a source server as transferred and disable its automations (POST /servers/{uuid}/transfer/complete)",
		{
			uuid: schemas.uuid.describe("Server UUID"),
			export_id: z.string().optional(),
			target_instance_url: z.string().optional(),
			confirm: schemas.confirm,
		},
		async ({ uuid, export_id, target_instance_url }) =>
			client.completeServerTransfer(uuid, definedRecord({ export_id, target_instance_url })),
	);

	registerApiTool<{ uuid: string; passphrase?: string; confirm?: boolean }>(
		server,
		config,
		"coolify_write_server_transfer_mailbox",
		"[DESTRUCTIVE] Write this server's transfer bundle to its host mailbox (POST /servers/{uuid}/export/mailbox). Requires read:sensitive.",
		{
			uuid: schemas.uuid.describe("Server UUID"),
			passphrase: z.string().optional(),
			confirm: schemas.confirm,
		},
		async ({ uuid, passphrase }) =>
			client.writeServerTransferMailbox(uuid, definedRecord({ passphrase })),
	);
}
