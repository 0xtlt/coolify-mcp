import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CoolifyClient } from "../client";
import type { Config } from "../config";
import { registerDatabaseStorageTools } from "../tools/database-storages";
import { registerDatabaseTools } from "../tools/databases";
import { registerLogTools } from "../tools/logs";
import { registerPreviewTools } from "../tools/previews";
import { registerServiceStorageTools } from "../tools/service-storages";
import { registerSettingsTools } from "../tools/settings";
import { registerStorageTools } from "../tools/storages";
import { registerVolumeBackupTools } from "../tools/volume-backups";

const config: Config = {
	coolifyApiUrl: "https://coolify.example.com/api/v1",
	coolifyToken: "test-token",
	timeout: 5000,
	debug: false,
	readonly: false,
	requireConfirm: true,
};

describe("Coolify v4.3.23 MCP contracts", () => {
	let mcp: Client;
	let server: McpServer;
	const fetchMock = vi.fn<typeof fetch>();

	async function connect(overrides: Partial<Config> = {}) {
		const settings = { ...config, ...overrides };
		server = new McpServer({ name: "test", version: "4.1.0" });
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
});
