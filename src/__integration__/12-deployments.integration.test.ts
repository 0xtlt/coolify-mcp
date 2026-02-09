import { describe, expect, test } from "bun:test";
import { createTestClient, readState } from "./setup";

const client = createTestClient();

describe("12 - Deployments", () => {
	test("listDeployments returns an array", async () => {
		const deployments = await client.listDeployments();
		expect(Array.isArray(deployments)).toBe(true);
	});

	test("listApplicationDeployments returns paginated result", async () => {
		const { applicationUuid } = readState();
		const result = await client.listApplicationDeployments(applicationUuid!);
		expect(result).toHaveProperty("deployments");
		expect(Array.isArray(result.deployments)).toBe(true);
	});
});
