import { describe, expect, test } from "bun:test";
import { CoolifyApiError } from "../lib/errors";
import { createTestClient, readState } from "./setup";

const client = createTestClient();

describe("16 - Storages", () => {
	let storageUuid: string;

	test("listApplicationStorages returns data", async () => {
		const { applicationUuid } = readState();
		if (!applicationUuid) return;
		try {
			const storages = await client.listApplicationStorages(applicationUuid);
			expect(storages).toBeDefined();
		} catch (error) {
			if (error instanceof CoolifyApiError && error.statusCode === 404) {
				console.log("Storages endpoint not available on this Coolify version, skipping");
				return;
			}
			throw error;
		}
	});

	test("createApplicationStorage creates a storage mount", async () => {
		const { applicationUuid } = readState();
		if (!applicationUuid) return;
		try {
			const result = await client.createApplicationStorage(applicationUuid, {
				name: "integration-test-storage",
				mount_path: "/test-data",
			});
			expect(result).toHaveProperty("uuid");
			storageUuid = result.uuid;
		} catch (error) {
			if (error instanceof CoolifyApiError && [404, 422].includes(error.statusCode)) {
				console.log(`Storages create skipped (${error.statusCode}): ${error.responseBody}`);
				return;
			}
			throw error;
		}
	});

	test("deleteApplicationStorage cleans up", async () => {
		const { applicationUuid } = readState();
		if (!applicationUuid || !storageUuid) return;
		try {
			const result = await client.deleteApplicationStorage(applicationUuid, storageUuid);
			expect(result).toBeDefined();
		} catch (error) {
			if (error instanceof CoolifyApiError && [404, 422].includes(error.statusCode)) {
				console.log(`Storages delete skipped (${error.statusCode})`);
				return;
			}
			throw error;
		}
	});

	test("listDatabaseStorages returns data", async () => {
		const { databaseUuid } = readState();
		if (!databaseUuid) return;
		try {
			const storages = await client.listDatabaseStorages(databaseUuid);
			expect(storages).toBeDefined();
		} catch (error) {
			if (error instanceof CoolifyApiError && error.statusCode === 404) {
				console.log("Database storages endpoint not available, skipping");
				return;
			}
			throw error;
		}
	});

	test("listServiceStorages returns data", async () => {
		const { serviceUuid } = readState();
		if (!serviceUuid) return;
		try {
			const storages = await client.listServiceStorages(serviceUuid);
			expect(storages).toBeDefined();
		} catch (error) {
			if (error instanceof CoolifyApiError && error.statusCode === 404) {
				console.log("Service storages endpoint not available, skipping");
				return;
			}
			throw error;
		}
	});
});
