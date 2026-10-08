import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CoolifyClient } from "../client";
import type { Config } from "../config";
import { registerApplicationTools } from "../tools/applications";
import { registerAuditEventTools } from "../tools/audit-events";
import { registerDatabaseImportTools } from "../tools/database-imports";
import { registerDatabaseStorageTools } from "../tools/database-storages";
import { registerDatabaseTools } from "../tools/databases";
import { registerLogTools } from "../tools/logs";
import { registerPreviewTools } from "../tools/previews";
import { registerScheduledTaskTools } from "../tools/scheduled-tasks";
import { registerSecretManagerTools } from "../tools/secret-managers";
import { registerServerRegistryTools } from "../tools/server-registries";
import { registerServerTools } from "../tools/servers";
import { registerServiceStorageTools } from "../tools/service-storages";
import { registerServiceTools } from "../tools/services";
import { registerSettingsTools } from "../tools/settings";
import { registerStorageTools } from "../tools/storages";
import { registerTeamTools } from "../tools/teams";
import { registerVolumeBackupTools } from "../tools/volume-backups";

const config: Config = {
	coolifyApiUrl: "https://coolify.example.com/api/v1",
	coolifyToken: "test-token",
	timeout: 5000,
	debug: false,
	readonly: false,
	requireConfirm: true,
};

describe("Coolify v4.3.23 and v4.4.2 MCP contracts", () => {
	let mcp: Client;
	let server: McpServer;
	const fetchMock = vi.fn<typeof fetch>();

	async function connect(overrides: Partial<Config> = {}) {
		const settings = { ...config, ...overrides };
		server = new McpServer({ name: "test", version: "4.2.0" });
		const client = new CoolifyClient(settings);
		for (const register of [
			registerPreviewTools,
			registerSettingsTools,
			registerLogTools,
			registerStorageTools,
			registerDatabaseStorageTools,
			registerServiceStorageTools,
			registerDatabaseTools,
			registerVolumeBackupTools,
			registerApplicationTools,
			registerAuditEventTools,
			registerDatabaseImportTools,
			registerScheduledTaskTools,
			registerSecretManagerTools,
			registerServerRegistryTools,
			registerServerTools,
			registerServiceTools,
			registerTeamTools,
		]) {
			register(server, client, settings);
		}
		mcp = new Client({ name: "test-client", version: "1.0.0" });
		const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
		await server.connect(serverTransport);
		await mcp.connect(clientTransport);
	}

	beforeEach(async () => {
		fetchMock
			.mockReset()
			.mockImplementation(
				async () => new Response(JSON.stringify({ uuid: "created", message: "ok" })),
			);
		vi.stubGlobal("fetch", fetchMock);
		await connect();
	});
	afterEach(async () => {
		await mcp.close();
		await server.close();
		vi.unstubAllGlobals();
	});

	function request(method: string, path: string, body?: unknown) {
		expect(fetchMock).toHaveBeenLastCalledWith(
			`${config.coolifyApiUrl}${path}`,
			expect.objectContaining({ method }),
		);
		const init = fetchMock.mock.lastCall?.[1];
		expect(init?.body ? JSON.parse(String(init.body)) : undefined).toEqual(body);
	}

	it("filters timestamped preview logs and forwards the PR number and all-lines option", async () => {
		fetchMock.mockResolvedValueOnce(
			new Response(
				JSON.stringify({
					logs: "2026-09-22T10:00:00Z INFO: ready\n2026-09-22T11:00:00Z ERROR: failed",
				}),
			),
		);
		const result = await mcp.callTool({
			name: "coolify_get_application_preview_logs",
			arguments: {
				uuid: "app-1",
				pull_request_id: 42,
				lines: "all",
				since: "2026-09-22T10:30:00Z",
				level: "error",
			},
		});
		expect(result.isError).toBeFalsy();
		expect(JSON.stringify(result)).toContain("failed");
		expect(JSON.stringify(result)).not.toContain("ready");
		request("GET", "/applications/app-1/previews/42/logs?lines=all&show_timestamps=true");
	});

	it.each([
		"logs",
		"database_logs",
		"service_logs",
	])("supports timestamp and line options for %s", async (name) => {
		const resource =
			name === "logs" ? "applications" : name === "database_logs" ? "databases" : "services";
		await mcp.callTool({
			name: `coolify_get_${name}`,
			arguments: { uuid: "resource-1", lines: -1, show_timestamps: false },
		});
		request("GET", `/${resource}/resource-1/logs?lines=-1&show_timestamps=false`);
	});

	it.each([
		0, -1, 1.5,
	])("rejects invalid preview PR number %s before HTTP", async (pull_request_id) => {
		const result = await mcp.callTool({
			name: "coolify_get_application_preview_logs",
			arguments: { uuid: "app-1", pull_request_id },
		});
		expect(result.isError).toBe(true);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it.each([
		{ domains: null },
		{ domains: "https://pr.example.com:3000", force_domain_override: true },
		{
			docker_compose_domains: [{ name: "web", domain: "https://pr.example.com", redirect: "both" }],
		},
		{ docker_compose_domains: [] },
	])("preserves preview domain replacement payload %j", async (fields) => {
		const result = await mcp.callTool({
			name: "coolify_update_application_preview",
			arguments: { uuid: "app-1", pull_request_id: 42, ...fields },
		});
		expect(result.isError).toBeFalsy();
		request("PATCH", "/applications/app-1/previews/42", fields);
	});

	it.each([
		{},
		{ domains: null, docker_compose_domains: [] },
	])("rejects ambiguous preview update %j", async (fields) => {
		const result = await mcp.callTool({
			name: "coolify_update_application_preview",
			arguments: { uuid: "app-1", pull_request_id: 42, ...fields },
		});
		expect(result.isError).toBe(true);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("requires confirmation before deleting preview volumes", async () => {
		const args = { uuid: "app-1", pull_request_id: 42 };
		const result = await mcp.callTool({
			name: "coolify_delete_application_preview",
			arguments: args,
		});
		expect(result.isError).toBe(true);
		expect(fetchMock).not.toHaveBeenCalled();
		await mcp.callTool({
			name: "coolify_delete_application_preview",
			arguments: { ...args, confirm: true },
		});
		request("DELETE", "/applications/app-1/previews/42");
	});

	it("reads and patches instance email settings, preserving null and false", async () => {
		await mcp.callTool({ name: "coolify_get_instance_email_settings", arguments: {} });
		request("GET", "/settings/email");
		const fields = {
			smtp_enabled: false,
			smtp_password: null,
			smtp_port: 587,
			smtp_encryption: "starttls",
			resend_enabled: true,
			resend_api_key: "test-key",
		};
		await mcp.callTool({ name: "coolify_update_instance_email_settings", arguments: fields });
		request("PATCH", "/settings/email", fields);
	});

	it.each([
		{ smtp_port: 65536 },
		{ smtp_encryption: "ssl" },
		{ smtp_timeout: -1 },
	])("rejects invalid email settings %j", async (fields) => {
		const result = await mcp.callTool({
			name: "coolify_update_instance_email_settings",
			arguments: fields,
		});
		expect(result.isError).toBe(true);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("keeps new reads but excludes writes and preview deletion in readonly mode", async () => {
		await mcp.close();
		await server.close();
		await connect({ readonly: true });
		const names = (await mcp.listTools()).tools.map((tool) => tool.name);
		expect(names).toContain("coolify_get_application_preview_logs");
		expect(names).toContain("coolify_get_instance_email_settings");
		for (const name of [
			"coolify_update_application_preview",
			"coolify_delete_application_preview",
			"coolify_update_instance_email_settings",
		]) {
			expect(names).not.toContain(name);
		}
	});

	it.each([
		"application",
		"database",
		"service",
	])("creates %s host-file mounts using the current payload", async (resource) => {
		const fields = {
			type: "file",
			mount_path: "/etc/app.conf",
			fs_path: "/data/app.conf",
			is_host_file: true,
			...(resource === "service" ? { resource_uuid: "child-1" } : {}),
		};
		const result = await mcp.callTool({
			name: `coolify_create_${resource}_storage`,
			arguments: { uuid: "resource-1", ...fields },
		});
		expect(result.isError).toBeFalsy();
		request("POST", `/${resource}s/resource-1/storages`, fields);
	});

	it.each([
		"application",
		"database",
		"service",
	])("rejects obsolete %s host_path before HTTP for create and update", async (resource) => {
		for (const action of ["create", "update"]) {
			const result = await mcp.callTool({
				name: `coolify_${action}_${resource}_storage`,
				arguments: {
					uuid: "resource-1",
					resource_uuid: "child-1",
					storage_uuid: "storage-1",
					type: "persistent",
					name: "data",
					mount_path: "/data",
					host_path: "/host/data",
				},
			});
			expect(result.isError).toBe(true);
			expect(JSON.stringify(result)).toContain("fs_path");
		}
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("requires a backup frequency and preserves the created schedule UUID", async () => {
		const missing = await mcp.callTool({
			name: "coolify_create_database_backup",
			arguments: { uuid: "db-1" },
		});
		expect(missing.isError).toBe(true);
		expect(fetchMock).not.toHaveBeenCalled();
		const fields = {
			frequency: "0 2 * * *",
			enabled: false,
			backup_now: false,
			missing_backup_notification_days: 7,
			timeout: 600,
			save_s3: true,
			s3_storage_uuid: "s3-1",
		};
		const result = await mcp.callTool({
			name: "coolify_create_database_backup",
			arguments: { uuid: "db-1", ...fields },
		});
		expect(result.isError).toBeFalsy();
		expect(JSON.stringify(result)).toContain("created");
		request("POST", "/databases/db-1/backups", fields);
	});

	it("updates backup notification, retention and S3 options without injecting defaults", async () => {
		const fields = {
			missing_backup_notification_days: 0,
			save_s3: false,
			s3_storage_uuid: null,
			database_backup_retention_days_locally: 3,
		};
		await mcp.callTool({
			name: "coolify_update_database_backup",
			arguments: { uuid: "db-1", backup_uuid: "backup-1", ...fields },
		});
		request("PATCH", "/databases/db-1/backups/backup-1", fields);
	});

	it.each([59, 36001])("rejects backup timeout %s before HTTP", async (timeout) => {
		for (const name of [
			"coolify_update_database_backup",
			"coolify_set_application_storage_backup",
		]) {
			const result = await mcp.callTool({
				name,
				arguments: {
					uuid: "db-1",
					backup_uuid: "backup-1",
					storage_uuid: "storage-1",
					frequency: "0 2 * * *",
					timeout,
				},
			});
			expect(result.isError).toBe(true);
		}
		expect(fetchMock).not.toHaveBeenCalled();
	});

	// --- Coolify v4.4.2 ---

	it("lists previews as summaries and reads one preview", async () => {
		fetchMock.mockResolvedValueOnce(
			new Response(
				JSON.stringify([
					{
						uuid: "preview-1",
						pull_request_id: 42,
						status: "running:healthy",
						domains: "https://42.example.com",
						git_type: "github",
						docker_registry_image_tag: null,
					},
				]),
			),
		);
		const list = await mcp.callTool({
			name: "coolify_list_application_previews",
			arguments: { uuid: "app-1" },
		});
		request("GET", "/applications/app-1/previews");
		expect(JSON.stringify(list)).toContain("42.example.com");
		expect(JSON.stringify(list)).not.toContain("docker_registry_image_tag");
		await mcp.callTool({
			name: "coolify_get_application_preview",
			arguments: { uuid: "app-1", pull_request_id: 42 },
		});
		request("GET", "/applications/app-1/previews/42");
	});

	it.each([
		{ pull_request_id: 42 },
		{ pull_request_id: 42, git_type: "bitbucket", commit: "abc1234", force: true },
		{ pull_request_id: 7, docker_tag: "pr-7", instant_deploy: false },
		{ pull_request_id: 7, pull_request_html_url: "https://github.com/acme/app/pull/7" },
	])("forwards the preview deployment payload %j", async (fields) => {
		const result = await mcp.callTool({
			name: "coolify_deploy_application_preview",
			arguments: { uuid: "app-1", ...fields },
		});
		expect(result.isError).toBeFalsy();
		request("POST", "/applications/app-1/previews", fields);
	});

	it.each([
		{ pull_request_id: 2147483648 },
		{ pull_request_id: 42, git_type: "bitbucket" },
		{ pull_request_id: 42, docker_tag: "pr-42", commit: "abc1234" },
		{ pull_request_id: 42, commit: "not-a-sha" },
		{ pull_request_id: 42, git_type: "svn" },
	])("rejects invalid preview deployment %j before HTTP", async (fields) => {
		const result = await mcp.callTool({
			name: "coolify_deploy_application_preview",
			arguments: { uuid: "app-1", ...fields },
		});
		expect(result.isError).toBe(true);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("selects a Compose service container for application and preview logs", async () => {
		await mcp.callTool({
			name: "coolify_get_logs",
			arguments: { uuid: "app-1", service_name: "worker" },
		});
		request("GET", "/applications/app-1/logs?lines=100&show_timestamps=true&service_name=worker");
		await mcp.callTool({
			name: "coolify_get_application_preview_logs",
			arguments: { uuid: "app-1", pull_request_id: 42, service_name: "web" },
		});
		request(
			"GET",
			"/applications/app-1/previews/42/logs?lines=100&show_timestamps=true&service_name=web",
		);
	});

	it("requires confirmation, then starts and polls a database import", async () => {
		const fields = {
			source: "s3",
			s3_storage_uuid: "s3-1",
			path: "backups/pg.dump",
			replace_existing: true,
			keep_owners: false,
		};
		const blocked = await mcp.callTool({
			name: "coolify_import_database",
			arguments: { uuid: "db-1", ...fields },
		});
		expect(blocked.isError).toBe(true);
		expect(fetchMock).not.toHaveBeenCalled();
		await mcp.callTool({
			name: "coolify_import_database",
			arguments: { uuid: "db-1", ...fields, confirm: true },
		});
		request("POST", "/databases/db-1/imports", fields);
		await mcp.callTool({
			name: "coolify_get_database_import",
			arguments: { uuid: "db-1", activity_id: 12 },
		});
		request("GET", "/databases/db-1/imports/12");
	});

	it("starts and polls a service database import", async () => {
		const fields = { source: "server", path: "/backups/mysql.sql.gz", restore_mysql_users: true };
		await mcp.callTool({
			name: "coolify_import_service_database",
			arguments: { uuid: "svc-1", database_uuid: "sdb-1", ...fields, confirm: true },
		});
		request("POST", "/services/svc-1/databases/sdb-1/imports", fields);
		await mcp.callTool({
			name: "coolify_get_service_database_import",
			arguments: { uuid: "svc-1", database_uuid: "sdb-1", activity_id: 3 },
		});
		request("GET", "/services/svc-1/databases/sdb-1/imports/3");
	});

	it.each([
		{ source: "upload" },
		{ source: "upload", upload_id: "not-a-uuid" },
		{ source: "upload", upload_id: "6f1c2a9e-0b7d-4c8a-9e21-3f5d7a1b2c4d", path: "/tmp/x.sql" },
		{ source: "s3", path: "backups/pg.dump" },
		{ source: "s3", s3_storage_uuid: "s3-1" },
		{ source: "server", path: "/backups/x.sql", s3_storage_uuid: "s3-1" },
		{ source: "ftp", path: "/backups/x.sql" },
	])("rejects inconsistent import source %j before HTTP", async (fields) => {
		for (const [name, target] of [
			["coolify_import_database", { uuid: "db-1" }],
			["coolify_import_service_database", { uuid: "svc-1", database_uuid: "sdb-1" }],
		] as const) {
			const result = await mcp.callTool({
				name,
				arguments: { ...target, ...fields, confirm: true },
			});
			expect(result.isError).toBe(true);
		}
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("lists, logs in to, checks and logs out of a server registry", async () => {
		await mcp.callTool({ name: "coolify_list_server_registries", arguments: { uuid: "srv-1" } });
		request("GET", "/servers/srv-1/registries");
		const login = { registry: "ghcr.io", username: "octocat", password: "test-token" };
		await mcp.callTool({
			name: "coolify_login_server_registry",
			arguments: { uuid: "srv-1", ...login },
		});
		request("POST", "/servers/srv-1/registries", login);
		await mcp.callTool({
			name: "coolify_check_server_registry",
			arguments: { uuid: "srv-1", registry: "Registry.Example.com:5000" },
		});
		request("POST", "/servers/srv-1/registries/registry.example.com%3A5000/check");
		const blocked = await mcp.callTool({
			name: "coolify_logout_server_registry",
			arguments: { uuid: "srv-1", registry: "ghcr.io" },
		});
		expect(blocked.isError).toBe(true);
		await mcp.callTool({
			name: "coolify_logout_server_registry",
			arguments: { uuid: "srv-1", registry: "ghcr.io", confirm: true },
		});
		request("DELETE", "/servers/srv-1/registries/ghcr.io");
	});

	it.each([
		"https://ghcr.io",
		"ghcr.io/owner",
		"../keys",
		"",
	])("rejects registry %j before HTTP", async (registry) => {
		for (const name of ["coolify_check_server_registry", "coolify_logout_server_registry"]) {
			const result = await mcp.callTool({
				name,
				arguments: { uuid: "srv-1", registry, confirm: true },
			});
			expect(result.isError).toBe(true);
		}
		const login = await mcp.callTool({
			name: "coolify_login_server_registry",
			arguments: { uuid: "srv-1", registry, username: "octocat", password: "test-token" },
		});
		expect(login.isError).toBe(true);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("rejects a registry username with spaces before HTTP", async () => {
		const result = await mcp.callTool({
			name: "coolify_login_server_registry",
			arguments: {
				uuid: "srv-1",
				registry: "ghcr.io",
				username: "octo cat",
				password: "test-token",
			},
		});
		expect(result.isError).toBe(true);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("creates an integration token and links it to an application", async () => {
		const token = {
			provider: "infisical",
			name: "Infisical prod",
			token: "test-client-secret",
			metadata: { base_url: "https://app.infisical.com", client_id: "client-1" },
		};
		const created = await mcp.callTool({
			name: "coolify_create_integration_token",
			arguments: token,
		});
		expect(JSON.stringify(created)).toContain("created");
		request("POST", "/security/integration-tokens", token);
		const link = {
			integration_token_uuid: "token-1",
			settings: { project_id: "proj-1", environment: "prod", secret_path: null },
		};
		await mcp.callTool({
			name: "coolify_update_application_secret_manager",
			arguments: { uuid: "app-1", ...link },
		});
		request("PATCH", "/applications/app-1/secret-manager", link);
	});

	it.each([
		{ provider: "doppler", name: "Doppler", token: "test-token" },
		{
			provider: "infisical",
			name: "Infisical",
			token: "t",
			metadata: { base_url: "https://i.io" },
		},
		{ provider: "vault", name: "Vault", token: "t" },
		{ provider: "vault", name: "Vault", token: "t", metadata: { base_url: "not a url" } },
		{ provider: "aws", name: "AWS", token: "t" },
	])("rejects invalid integration token %j before HTTP", async (fields) => {
		const result = await mcp.callTool({
			name: "coolify_create_integration_token",
			arguments: fields,
		});
		expect(result.isError).toBe(true);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("filters the audit log and validates page size", async () => {
		await mcp.callTool({ name: "coolify_list_audit_events", arguments: {} });
		request("GET", "/audit-events");
		await mcp.callTool({
			name: "coolify_list_audit_events",
			arguments: { page: 2, per_page: 50, search: "deploy key", source: "api" },
		});
		request("GET", "/audit-events?page=2&per_page=50&search=deploy+key&source=api");
		fetchMock.mockClear();
		const result = await mcp.callTool({
			name: "coolify_list_audit_events",
			arguments: { per_page: 101 },
		});
		expect(result.isError).toBe(true);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("updates the build server fallback of the current team", async () => {
		await mcp.callTool({
			name: "coolify_update_current_team",
			arguments: { is_build_server_fallback_enabled: false },
		});
		request("PATCH", "/team", { is_build_server_fallback_enabled: false });
		fetchMock.mockClear();
		const result = await mcp.callTool({ name: "coolify_update_current_team", arguments: {} });
		expect(result.isError).toBe(true);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("sends server roles and rejects a conflicting deprecated flag", async () => {
		const fields = { server_role: "deployment", server_disk_usage_notification_interval_hours: 48 };
		await mcp.callTool({ name: "coolify_update_server", arguments: { uuid: "srv-1", ...fields } });
		request("PATCH", "/servers/srv-1", fields);
		fetchMock.mockClear();
		for (const [name, args] of [
			["coolify_update_server", { uuid: "srv-1" }],
			["coolify_create_server", { name: "build", ip: "10.0.0.1", private_key_uuid: "key-1" }],
		] as const) {
			const result = await mcp.callTool({
				name,
				arguments: { ...args, server_role: "both", is_build_server: true },
			});
			expect(result.isError).toBe(true);
		}
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("deletes a server from its cloud provider only when asked", async () => {
		await mcp.callTool({
			name: "coolify_delete_server",
			arguments: { uuid: "srv-1", confirm: true },
		});
		request("DELETE", "/servers/srv-1");
		await mcp.callTool({
			name: "coolify_delete_server",
			arguments: { uuid: "srv-1", delete_from_provider: true, confirm: true },
		});
		request("DELETE", "/servers/srv-1?delete_from_provider=true");
	});

	it("creates a SQLite database with its database files", async () => {
		const result = await mcp.callTool({
			name: "coolify_create_database",
			arguments: {
				type: "sqlite",
				server_uuid: "srv-1",
				project_uuid: "proj-1",
				environment_name: "production",
				name: "cache",
				type_config: { sqlite_databases: "app.db,jobs.db" },
			},
		});
		expect(result.isError).toBeFalsy();
		request("POST", "/databases/sqlite", {
			server_uuid: "srv-1",
			project_uuid: "proj-1",
			environment_name: "production",
			name: "cache",
			sqlite_databases: "app.db,jobs.db",
		});
	});

	it("forwards the container name prefix and Coolify-only service deletion", async () => {
		await mcp.callTool({
			name: "coolify_update_application",
			arguments: { uuid: "app-1", custom_container_name_prefix: "shop-api" },
		});
		request("PATCH", "/applications/app-1", { custom_container_name_prefix: "shop-api" });
		await mcp.callTool({
			name: "coolify_delete_service",
			arguments: { uuid: "svc-1", delete_from_coolify_only: true, confirm: true },
		});
		request(
			"DELETE",
			"/services/svc-1?delete_volumes=true&docker_cleanup=true&delete_from_coolify_only=true",
		);
	});

	it("sets missing volume backup alerts and caps scheduled task timeouts", async () => {
		const fields = { frequency: "0 3 * * *", missing_backup_notification_days: 2 };
		await mcp.callTool({
			name: "coolify_set_database_storage_backup",
			arguments: { uuid: "db-1", storage_uuid: "storage-1", ...fields },
		});
		request("PUT", "/databases/db-1/storages/storage-1/backups", fields);
		fetchMock.mockClear();
		const result = await mcp.callTool({
			name: "coolify_create_application_scheduled_task",
			arguments: {
				uuid: "app-1",
				name: "cleanup",
				command: "php artisan cleanup",
				frequency: "0 * * * *",
				timeout: 36001,
			},
		});
		expect(result.isError).toBe(true);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("keeps v4.4 reads but excludes v4.4 writes in readonly mode", async () => {
		await mcp.close();
		await server.close();
		await connect({ readonly: true });
		const names = (await mcp.listTools()).tools.map((tool) => tool.name);
		for (const name of [
			"coolify_list_application_previews",
			"coolify_get_application_preview",
			"coolify_get_database_import",
			"coolify_get_service_database_import",
			"coolify_list_server_registries",
			"coolify_list_audit_events",
		]) {
			expect(names).toContain(name);
		}
		for (const name of [
			"coolify_deploy_application_preview",
			"coolify_import_database",
			"coolify_import_service_database",
			"coolify_login_server_registry",
			"coolify_check_server_registry",
			"coolify_logout_server_registry",
			"coolify_create_integration_token",
			"coolify_update_application_secret_manager",
			"coolify_update_current_team",
		]) {
			expect(names).not.toContain(name);
		}
	});
});
