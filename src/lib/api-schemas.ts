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

export type DatabaseBackupInput = z.infer<z.ZodObject<typeof databaseBackupFields>>;
export type InstanceEmailSettings = z.infer<z.ZodObject<typeof instanceEmailFields>>;
export type PreviewDomainsInput = z.infer<z.ZodObject<typeof previewDomainFields>>;
