import { describe, test } from "bun:test";
import { CoolifyApiError } from "../lib/errors";
import { createTestClient, readState } from "./setup";

const client = createTestClient();

async function safeDelete(fn: () => Promise<unknown>, label: string): Promise<void> {
	try {
		await fn();
	} catch (error) {
		if (error instanceof CoolifyApiError && [400, 404].includes(error.statusCode)) {
			console.log(`${label}: skipped (${error.statusCode})`);
			return;
		}
		throw error;
	}
}

describe("14 - Cleanup", () => {
	test("delete application", async () => {
		const { applicationUuid } = readState();
		if (!applicationUuid) return;
		await safeDelete(() => client.deleteApplication(applicationUuid), "Application");
	});

	test("delete database", async () => {
		const { databaseUuid } = readState();
		if (!databaseUuid) return;
		await safeDelete(() => client.deleteDatabase(databaseUuid), "Database");
	});

	test("delete service", async () => {
		const { serviceUuid } = readState();
		if (!serviceUuid) return;
		await safeDelete(() => client.deleteService(serviceUuid), "Service");
	});

	test("delete private key", async () => {
		const { privateKeyUuid } = readState();
		if (!privateKeyUuid) return;
		await safeDelete(() => client.deletePrivateKey(privateKeyUuid), "Private Key");
	});

	test("delete staging environment", async () => {
		const { projectUuid, environmentName } = readState();
		if (!projectUuid || !environmentName) return;
		await safeDelete(() => client.deleteEnvironment(projectUuid, environmentName), "Environment");
	});

	test("delete project", async () => {
		const { projectUuid } = readState();
		if (!projectUuid) return;
		await safeDelete(() => client.deleteProject(projectUuid), "Project");
	});
});
