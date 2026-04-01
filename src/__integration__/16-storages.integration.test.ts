import { describe, expect, test } from "bun:test";
import { createTestClient, readState } from "./setup";

const client = createTestClient();

describe("16 - Storages", () => {
	let storageUuid: string;

	test("listApplicationStorages returns an array", async () => {
		const { applicationUuid } = readState();
		if (!applicationUuid) return;
		const storages = await client.listApplicationStorages(applicationUuid);
		expect(Array.isArray(storages)).toBe(true);
	});

	test("createApplicationStorage creates a storage mount", async () => {
		const { applicationUuid } = readState();
		if (!applicationUuid) return;
		const result = await client.createApplicationStorage(applicationUuid, {
			name: "integration-test-storage",
			mount_path: "/test-data",
		});
		expect(result).toHaveProperty("uuid");
		expect(result.uuid.length).toBeGreaterThan(0);
		storageUuid = result.uuid;
	});

	test("listApplicationStorages includes the created storage", async () => {
		const { applicationUuid } = readState();
		if (!applicationUuid) return;
		const storages = await client.listApplicationStorages(applicationUuid);
		const found = storages.find((s) => s.uuid === storageUuid);
		expect(found).toBeDefined();
		expect(found?.name).toBe("integration-test-storage");
		expect(found?.mount_path).toBe("/test-data");
	});

	test("deleteApplicationStorage deletes the storage", async () => {
		const { applicationUuid } = readState();
		if (!applicationUuid || !storageUuid) return;
		const result = await client.deleteApplicationStorage(applicationUuid, storageUuid);
		expect(result).toBeDefined();
	});

	test("listDatabaseStorages returns an array", async () => {
		const { databaseUuid } = readState();
		if (!databaseUuid) return;
		const storages = await client.listDatabaseStorages(databaseUuid);
		expect(Array.isArray(storages)).toBe(true);
	});

	test("listServiceStorages returns an array", async () => {
		const { serviceUuid } = readState();
		if (!serviceUuid) return;
		const storages = await client.listServiceStorages(serviceUuid);
		expect(Array.isArray(storages)).toBe(true);
	});
});
