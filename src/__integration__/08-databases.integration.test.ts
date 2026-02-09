import { describe, expect, test } from "bun:test";
import { createTestClient, readState, updateState } from "./setup";

const client = createTestClient();

describe("08 - Databases", () => {
	test("createDatabase creates a postgresql database", async () => {
		const { serverUuid, projectUuid, environmentName } = readState();
		const result = await client.createDatabase("postgresql", {
			server_uuid: serverUuid!,
			project_uuid: projectUuid!,
			environment_name: environmentName ?? "production",
			name: "integration-test-db",
			description: "Created by integration tests",
			instant_deploy: false,
		});
		expect(result).toHaveProperty("uuid");
		expect(result.uuid.length).toBeGreaterThan(0);
		updateState({ databaseUuid: result.uuid });
	});

	test("listDatabases includes the created database", async () => {
		const dbs = await client.listDatabases();
		expect(Array.isArray(dbs)).toBe(true);
		const { databaseUuid } = readState();
		const found = dbs.find((d) => d.uuid === databaseUuid);
		expect(found).toBeDefined();
	});

	test("getDatabase returns database details", async () => {
		const { databaseUuid } = readState();
		const db = await client.getDatabase(databaseUuid!);
		expect(db.uuid).toBe(databaseUuid!);
		expect(db.name).toBe("integration-test-db");
	});

	test("updateDatabase renames the database", async () => {
		const { databaseUuid } = readState();
		const result = await client.updateDatabase(databaseUuid!, {
			name: "integration-test-db-updated",
		});
		// Coolify returns { message: "Database updated." }
		expect(result).toBeDefined();
	});

	test("listDatabaseBackups returns an array", async () => {
		const { databaseUuid } = readState();
		const backups = await client.listDatabaseBackups(databaseUuid!);
		expect(Array.isArray(backups)).toBe(true);
	});
});
