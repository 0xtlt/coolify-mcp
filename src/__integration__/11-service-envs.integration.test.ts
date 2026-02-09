import { describe, expect, test } from "bun:test";
import { CoolifyApiError } from "../lib/errors";
import { createTestClient, readState, updateState } from "./setup";

const client = createTestClient();

describe("11 - Service Environment Variables", () => {
	test("createServiceEnv creates an env var on the service", async () => {
		const { serviceUuid } = readState();
		if (!serviceUuid) return;
		try {
			const result = await client.createServiceEnv(serviceUuid, {
				key: "SVC_TEST_KEY",
				value: "svc_test_value",
				is_preview: false,
			});
			expect(result).toHaveProperty("uuid");
			updateState({ serviceEnvUuid: result.uuid });
		} catch (error) {
			// Endpoint may not exist in this Coolify version
			if (error instanceof CoolifyApiError && error.statusCode === 404) {
				console.log("Service envs endpoint not available in this version, skipping");
				return;
			}
			throw error;
		}
	});

	test("listServiceEnvs includes the created env var", async () => {
		const { serviceUuid, serviceEnvUuid } = readState();
		if (!serviceUuid || !serviceEnvUuid) return;
		const envs = await client.listServiceEnvs(serviceUuid);
		expect(Array.isArray(envs)).toBe(true);
		const found = envs.find((e) => e.uuid === serviceEnvUuid);
		expect(found).toBeDefined();
		expect(found!.key).toBe("SVC_TEST_KEY");
	});

	test("updateServiceEnvsBulk updates env vars", async () => {
		const { serviceUuid, serviceEnvUuid } = readState();
		if (!serviceUuid || !serviceEnvUuid) return;
		const result = await client.updateServiceEnvsBulk(serviceUuid, [
			{ key: "SVC_TEST_KEY", value: "updated_svc_value", is_preview: false },
		]);
		expect(Array.isArray(result)).toBe(true);
	});

	test("deleteServiceEnv removes the env var", async () => {
		const { serviceUuid, serviceEnvUuid } = readState();
		if (!serviceUuid || !serviceEnvUuid) return;
		const result = await client.deleteServiceEnv(serviceUuid, serviceEnvUuid);
		expect(result).toHaveProperty("message");
	});
});
