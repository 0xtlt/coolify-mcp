import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CoolifyClient, NotificationChannel } from "../client";
import type { Config } from "../config";
import { definedRecord, registerApiTool } from "../lib/register-tool";

const channel = z
	.enum(["email", "discord", "slack", "telegram", "pushover", "webhook"])
	.describe("Notification channel");

const settingValue = z.union([z.string(), z.number(), z.boolean(), z.null()]);

const emailSettings = {
	smtp_enabled: z.boolean().optional(),
	smtp_from_address: z.string().email().nullable().optional(),
	smtp_from_name: z.string().max(255).nullable().optional(),
	smtp_host: z.string().max(255).nullable().optional(),
	smtp_port: z.number().int().min(1).max(65535).nullable().optional(),
	smtp_encryption: z.enum(["starttls", "tls", "none"]).nullable().optional(),
	smtp_username: z.string().max(255).nullable().optional(),
	smtp_password: z.string().max(255).nullable().optional(),
	smtp_timeout: z.number().int().min(0).nullable().optional(),
	smtp_ehlo_domain: z.string().max(255).nullable().optional(),
	resend_enabled: z.boolean().optional(),
	resend_api_key: z.string().max(255).nullable().optional(),
};

export function registerNotificationTools(
	server: McpServer,
	client: CoolifyClient,
	config: Config,
) {
	registerApiTool<{ channel: NotificationChannel }>(
		server,
		config,
		"coolify_get_notification_settings",
		"Get team notification settings for email, discord, slack, telegram, pushover, or webhook",
		{ channel },
		async ({ channel: selected }) => client.getNotificationSettings(selected),
	);

	registerApiTool<{ channel: NotificationChannel; settings: Record<string, unknown> }>(
		server,
		config,
		"coolify_update_notification_settings",
		"[WRITE] Update team notification settings. Pass only fields accepted by that channel (for example discord_enabled and discord_webhook_url, or smtp_* / *_email_notifications). Unknown fields are rejected by Coolify.",
		{
			channel,
			settings: z
				.record(z.string(), settingValue)
				.describe("Channel fields to update. Keys must match the Coolify channel schema."),
		},
		async ({ channel: selected, settings }) =>
			client.updateNotificationSettings(selected, settings),
	);

	registerApiTool(
		server,
		config,
		"coolify_get_instance_email_settings",
		"Get instance-wide SMTP and Resend settings (GET /settings/email). Requires a root-team token.",
		{},
		async () => client.getInstanceEmailSettings(),
	);

	registerApiTool<Record<string, unknown>>(
		server,
		config,
		"coolify_update_instance_email_settings",
		"[WRITE] Update instance-wide SMTP and Resend settings (PATCH /settings/email). Requires write:sensitive and a root-team admin or owner token.",
		emailSettings,
		async (args) => {
			const data = definedRecord(args);
			if (Object.keys(data).length === 0) throw new Error("Provide at least one email setting.");
			return client.updateInstanceEmailSettings(data);
		},
	);
}
