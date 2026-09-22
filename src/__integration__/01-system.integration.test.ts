import { describe, expect, test } from "vitest";
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
	test("instance email settings can be read and updated without enabling mail", async () => {
		const original = await client.getInstanceEmailSettings();
		expect(original).toHaveProperty("smtp_enabled");
		try {
			const result = await client.updateInstanceEmailSettings({
				smtp_enabled: false,
				smtp_from_name: "MCP integration test",
			});
			expect(result.smtp_enabled).toBe(false);
			expect(result.smtp_from_name).toBe("MCP integration test");
		} finally {
			await client.updateInstanceEmailSettings({
				smtp_enabled: original.smtp_enabled,
				smtp_from_name: original.smtp_from_name,
			});
		}
	});
});
