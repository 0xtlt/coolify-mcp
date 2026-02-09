import { describe, expect, test } from "bun:test";
import { createTestClient, readState, updateState } from "./setup";

const client = createTestClient();

describe("10 - Services", () => {
	test("createService creates a service", async () => {
		const { serverUuid, projectUuid, environmentName } = readState();
		const result = await client.createService({
			server_uuid: serverUuid!,
			project_uuid: projectUuid!,
			environment_name: environmentName ?? "production",
			type: "uptime-kuma",
			name: "integration-test-service",
			description: "Created by integration tests",
			instant_deploy: false,
		});
		expect(result).toHaveProperty("uuid");
		expect(result.uuid.length).toBeGreaterThan(0);
		updateState({ serviceUuid: result.uuid });
	});

	test("listServices includes the created service", async () => {
		const services = await client.listServices();
		expect(Array.isArray(services)).toBe(true);
		const { serviceUuid } = readState();
		const found = services.find((s) => s.uuid === serviceUuid);
		expect(found).toBeDefined();
	});

	test("getService returns service details", async () => {
		const { serviceUuid } = readState();
		const service = await client.getService(serviceUuid!);
		expect(service.uuid).toBe(serviceUuid!);
	});

	test("updateService renames the service", async () => {
		const { serviceUuid } = readState();
		const result = await client.updateService(serviceUuid!, {
			name: "integration-test-service-updated",
		});
		expect(result).toHaveProperty("uuid");
	});
});
