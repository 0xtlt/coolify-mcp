import { describe, expect, test } from "bun:test";
import { createTestClient } from "./setup";

const client = createTestClient();

describe("17 - GitHub Apps", () => {
	test("listGitHubApps returns an array", async () => {
		const apps = await client.listGitHubApps();
		expect(Array.isArray(apps)).toBe(true);
	});
});
