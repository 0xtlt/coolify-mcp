import { describe, expect, test } from "bun:test";
import { createTestClient } from "./setup";

const client = createTestClient();

describe("01 - System", () => {
	test("getVersion returns a version string", async () => {
		const version = await client.getVersion();
		expect(typeof version).toBe("string");
		expect(version.length).toBeGreaterThan(0);
	});

	test("healthcheck returns OK", async () => {
		const health = await client.healthcheck();
		expect(typeof health).toBe("string");
	});
});
