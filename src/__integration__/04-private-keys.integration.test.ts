import { describe, expect, test } from "bun:test";
import { execSync } from "node:child_process";
import { readFileSync, unlinkSync } from "node:fs";
import { createTestClient, readState, updateState } from "./setup";

const client = createTestClient();

// Generate a fresh ed25519 key to avoid "already exists" collisions
function generateTestKey(): string {
	const keyPath = `/tmp/coolify-test-key-${Date.now()}`;
	execSync(`ssh-keygen -t ed25519 -f ${keyPath} -N "" -C "integration-test"`, { stdio: "ignore" });
	const key = readFileSync(keyPath, "utf-8");
	unlinkSync(keyPath);
	unlinkSync(`${keyPath}.pub`);
	return key;
}

const TEST_PRIVATE_KEY = generateTestKey();

describe("04 - Private Keys", () => {
	test("createPrivateKey creates a test key", async () => {
		const result = await client.createPrivateKey({
			name: "integration-test-key",
			description: "Created by integration tests",
			private_key: TEST_PRIVATE_KEY,
		});
		expect(result).toHaveProperty("uuid");
		updateState({ privateKeyUuid: result.uuid });
	});

	test("listPrivateKeys includes the created key", async () => {
		const keys = await client.listPrivateKeys();
		expect(Array.isArray(keys)).toBe(true);
		const { privateKeyUuid } = readState();
		const found = keys.find((k) => k.uuid === privateKeyUuid);
		expect(found).toBeDefined();
	});

	test("getPrivateKey returns the created key", async () => {
		const { privateKeyUuid } = readState();
		const key = await client.getPrivateKey(privateKeyUuid!);
		expect(key.uuid).toBe(privateKeyUuid!);
		expect(key.name).toBe("integration-test-key");
	});

	test("updatePrivateKey renames the key", async () => {
		const { privateKeyUuid } = readState();
		const result = await client.updatePrivateKey(privateKeyUuid!, {
			name: "integration-test-key-updated",
			private_key: TEST_PRIVATE_KEY,
		});
		expect(result).toHaveProperty("uuid");
	});
});
