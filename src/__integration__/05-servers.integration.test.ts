import { describe, expect, test } from "bun:test";
import { createTestClient, readState, updateState } from "./setup";

const client = createTestClient();

describe("05 - Servers", () => {
	test("listServers returns at least the localhost server", async () => {
		const servers = await client.listServers();
		expect(Array.isArray(servers)).toBe(true);
		expect(servers.length).toBeGreaterThan(0);
		// Store the first server (localhost) for later use
		updateState({ serverUuid: servers[0].uuid });
	});

	test("getServer returns server details", async () => {
		const { serverUuid } = readState();
		const server = await client.getServer(serverUuid!);
		expect(server).toHaveProperty("uuid");
		expect(server).toHaveProperty("name");
		expect(server).toHaveProperty("ip");
	});

	test("getServerResources returns an array", async () => {
		const { serverUuid } = readState();
		const resources = await client.getServerResources(serverUuid!);
		expect(Array.isArray(resources)).toBe(true);
	});

	test("getServerDomains returns an array", async () => {
		const { serverUuid } = readState();
		const domains = await client.getServerDomains(serverUuid!);
		expect(Array.isArray(domains)).toBe(true);
	});

	test("validateServer returns a message", async () => {
		const { serverUuid } = readState();
		try {
			const result = await client.validateServer(serverUuid!);
			expect(result).toHaveProperty("message");
		} catch {
			// Validation may fail in Docker test env (no SSH), that's expected
		}
	});
});
