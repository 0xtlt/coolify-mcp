import { z } from "zod";

// Validated against Coolify v4.3.23 controllers; OpenAPI omits some of these fields.
export const databaseBackupFields = {
	frequency: z.string().min(1).optional().describe("Cron expression for the backup schedule"),
	enabled: z.boolean().optional(),
	save_s3: z.boolean().optional(),
	dump_all: z.boolean().optional(),
	s3_storage_uuid: z
		.string()
		.nullable()
		.optional()
		.describe("S3 storage UUID (required with save_s3)"),
	databases_to_backup: z.string().nullable().optional(),
	database_backup_retention_amount_locally: z.number().int().min(0).optional(),
	database_backup_retention_days_locally: z.number().int().min(0).optional(),
	database_backup_retention_max_storage_locally: z.number().min(0).optional(),
	database_backup_retention_amount_s3: z.number().int().min(0).optional(),
	database_backup_retention_days_s3: z.number().int().min(0).optional(),
	database_backup_retention_max_storage_s3: z.number().min(0).optional(),
	timeout: z.number().int().min(60).max(36000).optional(),
	missing_backup_notification_days: z
		.number()
		.int()
		.min(0)
		.max(365)
		.optional()
		.describe(
			"Alert after this many days without an execution; 0 disables alerts (Coolify v4.3.23)",
		),
};

export const instanceEmailFields = {
	smtp_enabled: z.boolean().optional(),
	smtp_from_address: z.email().nullable().optional(),
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

export const previewDomainFields = {
	domains: z
		.string()
		.nullable()
		.optional()
		.describe(
			"Replace regular preview domains; null clears them. Mutually exclusive with docker_compose_domains.",
		),
	docker_compose_domains: z
		.array(
			z.object({
				name: z.string().min(1),
				domain: z.string().nullable().optional(),
				redirect: z.enum(["www", "non-www", "both"]).nullable().optional(),
			}),
		)
		.optional()
		.describe(
			"Replace Compose preview domains by service name; [] clears them. Mutually exclusive with domains.",
		),
	force_domain_override: z
		.boolean()
		.optional()
		.describe("Allow domain conflicts with other resources"),
};

// Validated against Coolify v4.4.2 controllers.
export const pullRequestId = z
	.number()
	.int()
	.min(1)
	.max(2147483647)
	.describe("Pull request number of the preview");

export const previewDeployFields = {
	pull_request_html_url: z.url().max(2048).nullable().optional().describe("Pull request URL"),
	git_type: z
		.enum(["github", "gitlab", "gitea", "bitbucket"])
		.optional()
		.describe(
			"Git provider of the pull request. Required for apps without a GitHub/GitLab App source; not allowed for Docker Image apps.",
		),
	commit: z
		.string()
		.regex(/^[0-9a-fA-F]{7,40}$/, "Expected a 7-40 character commit SHA")
		.optional()
		.describe("Commit SHA to deploy (required with git_type=bitbucket; Git apps only)"),
	docker_tag: z
		.string()
		.regex(/^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$/, "Invalid Docker tag")
		.optional()
		.describe("Image tag to deploy (Docker Image apps only; required for a new preview)"),
	force: z.boolean().optional().describe("Force rebuild without cache"),
	instant_deploy: z
		.boolean()
		.optional()
		.describe("Queue the deployment right away (default true); false only saves the preview"),
};

export const databaseImportFields = {
	source: z
		.enum(["upload", "s3", "server"])
		.describe(
			"Where the backup file comes from: an earlier upload, an S3 storage, or a path on the database server",
		),
	upload_id: z
		.guid()
		.optional()
		.describe("Upload ID returned by POST .../imports/uploads (source=upload only)"),
	s3_storage_uuid: z.string().min(1).optional().describe("S3 storage UUID (source=s3 only)"),
	path: z
		.string()
		.min(1)
		.max(4096)
		.optional()
		.describe("Object key (source=s3) or absolute server path (source=server)"),
	dump_all: z.boolean().optional().describe("The file is an all-databases dump"),
	replace_existing: z
		.boolean()
		.optional()
		.describe("Replace objects that already exist (PostgreSQL --clean behavior)"),
	keep_owners: z
		.boolean()
		.optional()
		.describe("Keep owners and privileges of a PostgreSQL archive"),
	restore_mysql_users: z
		.boolean()
		.optional()
		.describe("Restore users and privileges of an all-databases MySQL/MariaDB dump"),
	sqlite_database: z.string().min(1).max(255).optional().describe("Target SQLite database file"),
};

export const registryHost = z
	.string()
	.trim()
	.toLowerCase()
	.max(255)
	.regex(
		/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?(:[0-9]{1,5})?$/,
		"Enter a registry host, for example ghcr.io or registry.example.com:5000",
	)
	.describe("Registry host without scheme or path, e.g. ghcr.io or docker.io");

export const integrationTokenFields = {
	provider: z.enum(["doppler", "infisical", "vault"]).describe("Secret manager provider"),
	name: z.string().min(1).max(255).describe("Display name of the token"),
	token: z
		.string()
		.min(1)
		.describe(
			"Provider credential. Doppler: service token (dp.st.) or service account token (dp.sa.). Infisical: client secret. Vault: token.",
		),
	metadata: z
		.object({
			base_url: z.url().optional().describe("Provider URL (required for Infisical and Vault)"),
			client_id: z.string().min(1).optional().describe("Machine identity client ID (Infisical)"),
			namespace: z.string().nullable().optional().describe("Vault namespace"),
		})
		.optional(),
};

export const secretManagerLinkFields = {
	integration_token_uuid: z
		.string()
		.min(1)
		.describe("UUID of a Doppler, Infisical, or Vault integration token of the team"),
	settings: z
		.object({
			project: z.string().optional().describe("Doppler project (service account tokens)"),
			config: z.string().optional().describe("Doppler config (service account tokens)"),
			project_id: z.string().optional().describe("Infisical project ID"),
			environment: z.string().optional().describe("Infisical environment slug"),
			secret_path: z.string().nullable().optional().describe("Infisical secret path"),
			mount: z.string().optional().describe("Vault KV mount"),
			path: z.string().optional().describe("Vault secret path"),
		})
		.optional()
		.describe("Provider-specific location of the secrets"),
};

export const auditEventFilterFields = {
	page: z.number().int().min(1).optional().describe("Page number (default 1)"),
	per_page: z.number().int().min(1).max(100).optional().describe("Items per page (default 25)"),
	search: z
		.string()
		.max(255)
		.optional()
		.describe("Search in event, description, resource name, and actor"),
	action: z.string().max(255).optional().describe("Filter by action; all returns every action"),
	source: z
		.enum(["all", "ui", "api", "mcp", "webhook", "system", "scheduler"])
		.optional()
		.describe("Filter by where the change came from"),
};

export type DatabaseBackupInput = z.infer<z.ZodObject<typeof databaseBackupFields>>;
export type InstanceEmailSettings = z.infer<z.ZodObject<typeof instanceEmailFields>>;
export type PreviewDomainsInput = z.infer<z.ZodObject<typeof previewDomainFields>>;
export type PreviewDeployInput = z.infer<z.ZodObject<typeof previewDeployFields>> & {
	pull_request_id: number;
};
export type DatabaseImportInput = z.infer<z.ZodObject<typeof databaseImportFields>>;
export type IntegrationTokenInput = z.infer<z.ZodObject<typeof integrationTokenFields>>;
export type SecretManagerLinkInput = z.infer<z.ZodObject<typeof secretManagerLinkFields>>;
export type AuditEventFilter = z.infer<z.ZodObject<typeof auditEventFilterFields>>;
