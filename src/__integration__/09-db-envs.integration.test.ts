import { describe, expect, test } from "bun:test";
import { CoolifyApiError } from "../lib/errors";
import { createTestClient, readState, updateState } from "./setup";

const client = createTestClient();

describe("09 - Database Environment Variables", () => {
	test("createDatabaseEnv creates an env var on the database", async () => {
		const { databaseUuid } = readState();
		try {
			const result = await client.createDatabaseEnv(databaseUuid!, {
				key: "DB_TEST_KEY",
				value: "db_test_value",
				is_preview: false,
			});
			expect(result).toHaveProperty("uuid");
			updateState({ dbEnvUuid: result.uuid });
		} catch (error) {
			// Endpoint may not exist in this Coolify version
			if (error instanceof CoolifyApiError && error.statusCode === 404) {
				console.log("Database envs endpoint not available in this version, skipping");
				return;
			}
			throw error;
		}
	});

	test("listDatabaseEnvs includes the created env var", async () => {
		const { databaseUuid, dbEnvUuid } = readState();
		if (!dbEnvUuid) return; // skip if create was skipped
		const envs = await client.listDatabaseEnvs(databaseUuid!);
		expect(Array.isArray(envs)).toBe(true);
		const found = envs.find((e) => e.uuid === dbEnvUuid);
		expect(found).toBeDefined();
		expect(found!.key).toBe("DB_TEST_KEY");
	});

	test("updateDatabaseEnvsBulk updates env vars", async () => {
		const { databaseUuid, dbEnvUuid } = readState();
		if (!dbEnvUuid) return;
		const result = await client.updateDatabaseEnvsBulk(databaseUuid!, [
			{ key: "DB_TEST_KEY", value: "updated_db_value", is_preview: false },
		]);
		expect(Array.isArray(result)).toBe(true);
	});

	test("deleteDatabaseEnv removes the env var", async () => {
		const { databaseUuid, dbEnvUuid } = readState();
		if (!dbEnvUuid) return;
		const result = await client.deleteDatabaseEnv(databaseUuid!, dbEnvUuid!);
		expect(result).toHaveProperty("message");
	});
});
