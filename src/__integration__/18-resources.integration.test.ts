import { describe, expect, test } from "bun:test";
import { createTestClient } from "./setup";

const client = createTestClient();

describe("18 - Resources", () => {
	test("listResources returns an array", async () => {
		const resources = await client.listResources();
		expect(Array.isArray(resources)).toBe(true);
	});
});
