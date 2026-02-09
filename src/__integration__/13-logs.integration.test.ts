import { describe, expect, test } from "bun:test";
import { CoolifyApiError } from "../lib/errors";
import { createTestClient, readState } from "./setup";

const client = createTestClient();

describe("13 - Logs", () => {
	test("getApplicationLogs returns logs or handles gracefully", async () => {
		const { applicationUuid } = readState();
		try {
			const logs = await client.getApplicationLogs(applicationUuid!, 10);
			// Logs may be a string or structured; just check it didn't throw unexpectedly
			expect(logs).toBeDefined();
		} catch (error) {
			// App not running = no container logs, expect 400/404/500
			if (error instanceof CoolifyApiError) {
				expect([400, 404, 500]).toContain(error.statusCode);
			} else {
				throw error;
			}
		}
	});

	test("getDatabaseLogs returns logs or handles gracefully", async () => {
		const { databaseUuid } = readState();
		try {
			const logs = await client.getDatabaseLogs(databaseUuid!, 10);
			expect(logs).toBeDefined();
		} catch (error) {
			if (error instanceof CoolifyApiError) {
				expect([400, 404, 500]).toContain(error.statusCode);
			} else {
				throw error;
			}
		}
	});

	test("getServiceLogs returns logs or handles gracefully", async () => {
		const { serviceUuid } = readState();
		try {
			const logs = await client.getServiceLogs(serviceUuid!, 10);
			expect(logs).toBeDefined();
		} catch (error) {
			if (error instanceof CoolifyApiError) {
				expect([400, 404, 500]).toContain(error.statusCode);
			} else {
				throw error;
			}
		}
	});
});
