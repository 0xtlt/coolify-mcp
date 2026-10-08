import { describe, expect, test } from "vitest";
import { CoolifyApiError } from "../lib/errors";
import { createTestClient, readState } from "./setup";

const client = createTestClient();

async function statusOf(fn: () => Promise<unknown>): Promise<number | undefined> {
	try {
		await fn();
		return undefined;
	} catch (error) {
		if (error instanceof CoolifyApiError) return error.statusCode;
		throw error;
	}
}

describe("19 - Coolify v4.4 endpoints", () => {
	test("listAuditEvents returns a paginated page", async () => {
		const page = await client.listAuditEvents({ per_page: 5, source: "api" });
		expect(Array.isArray(page.data)).toBe(true);
		expect(page.per_page).toBe(5);
		expect(page.data.length).toBeGreaterThan(0);
		expect(page.data.every((event) => event.source === "api")).toBe(true);
	});

	test("updateCurrentTeam sets the build server fallback and restores it", async () => {
		const original = (await client.getCurrentTeam()) as unknown as Record<string, unknown>;
		const before = original.is_build_server_fallback_enabled !== false;
		try {
			const updated = (await client.updateCurrentTeam({
				is_build_server_fallback_enabled: !before,
			})) as unknown as Record<string, unknown>;
			expect(updated.is_build_server_fallback_enabled).toBe(!before);
		} finally {
			await client.updateCurrentTeam({ is_build_server_fallback_enabled: before });
		}
	});

	test("opens, reads, lists and deletes a preview without deploying it", async () => {
		const { applicationUuid } = readState();
		if (!applicationUuid) throw new Error("Application fixture is missing");
		const pullRequestId = 4242;
		expect(await statusOf(() => client.getApplicationPreview(applicationUuid, pullRequestId))).toBe(
			404,
		);

		const created = await client.deployApplicationPreview(applicationUuid, {
			pull_request_id: pullRequestId,
			docker_tag: "alpine",
			instant_deploy: false,
		});
		try {
			expect(created.deployment_uuid).toBeNull();
			expect(created.preview.pull_request_id).toBe(pullRequestId);
			expect(created.preview.docker_registry_image_tag).toBe("alpine");

			const preview = await client.getApplicationPreview(applicationUuid, pullRequestId);
			expect(preview.uuid).toBe(created.preview.uuid);
			const previews = await client.listApplicationPreviews(applicationUuid);
			expect(previews.map((item) => item.pull_request_id)).toContain(pullRequestId);
		} finally {
			await client.deleteApplicationPreview(applicationUuid, pullRequestId);
		}
		const previews = await client.listApplicationPreviews(applicationUuid);
		expect(previews.map((item) => item.pull_request_id)).not.toContain(pullRequestId);
	});

	test("rejects Git preview fields on a Docker Image application", async () => {
		const { applicationUuid } = readState();
		if (!applicationUuid) throw new Error("Application fixture is missing");
		const status = await statusOf(() =>
			client.deployApplicationPreview(applicationUuid, {
				pull_request_id: 4243,
				git_type: "github",
				instant_deploy: false,
			}),
		);
		expect(status).toBe(422);
	});

	test("creates and deletes a SQLite database", async () => {
		const { serverUuid, projectUuid, environmentName } = readState();
		const result = await client.createDatabase("sqlite", {
			server_uuid: serverUuid,
			project_uuid: projectUuid,
			environment_name: environmentName ?? "production",
			name: "integration-test-sqlite",
			sqlite_databases: "app.db,jobs.db",
			instant_deploy: false,
		});
		expect(result.uuid.length).toBeGreaterThan(0);
		try {
			const database = await client.getDatabase(result.uuid);
			expect(database.database_type).toBe("standalone-sqlite");
		} finally {
			await client.deleteDatabase(result.uuid);
		}
	});

	test("database import status returns 404 for an unknown import", async () => {
		const { databaseUuid } = readState();
		if (!databaseUuid) throw new Error("Database fixture is missing");
		expect(await statusOf(() => client.getDatabaseImport(databaseUuid, 999999))).toBe(404);
	});

	test("listServerRegistries reports registries or why they cannot be read", async () => {
		const { serverUuid } = readState();
		if (!serverUuid) throw new Error("Server fixture is missing");
		const result = await client.listServerRegistries(serverUuid);
		expect(Array.isArray(result.registries)).toBe(true);
		expect(result).toHaveProperty("error");
	});

	test("secret manager link returns 404 for an unknown integration token", async () => {
		const { applicationUuid } = readState();
		if (!applicationUuid) throw new Error("Application fixture is missing");
		const status = await statusOf(() =>
			client.updateApplicationSecretManager(applicationUuid, {
				integration_token_uuid: "does-not-exist",
			}),
		);
		expect(status).toBe(404);
	});

	test("updateServer accepts the disk usage notification interval", async () => {
		const { serverUuid } = readState();
		if (!serverUuid) throw new Error("Server fixture is missing");
		await client.updateServer(serverUuid, { server_disk_usage_notification_interval_hours: 12 });
		const server = (await client.getServer(serverUuid)) as unknown as {
			settings: Record<string, unknown>;
		};
		expect(server.settings.server_disk_usage_notification_interval_hours).toBe(12);
		await client.updateServer(serverUuid, { server_disk_usage_notification_interval_hours: 24 });
	});
});
