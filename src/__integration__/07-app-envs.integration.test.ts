import { describe, expect, test } from "bun:test";
import { createTestClient, readState, updateState } from "./setup";

const client = createTestClient();

describe("07 - Application Environment Variables", () => {
	test("createEnv creates an env var on the app", async () => {
		const { applicationUuid } = readState();
		const result = await client.createEnv(applicationUuid!, {
			key: "TEST_KEY",
			value: "test_value",
			is_preview: false,
		});
		expect(result).toHaveProperty("uuid");
		updateState({ appEnvUuid: result.uuid });
	});

	test("listEnvs includes the created env var", async () => {
		const { applicationUuid, appEnvUuid } = readState();
		const envs = await client.listEnvs(applicationUuid!);
		expect(Array.isArray(envs)).toBe(true);
		const found = envs.find((e) => e.uuid === appEnvUuid);
		expect(found).toBeDefined();
		expect(found!.key).toBe("TEST_KEY");
		expect(found!.value).toBe("test_value");
	});

	test("updateEnvsBulk updates env vars", async () => {
		const { applicationUuid } = readState();
		const result = await client.updateEnvsBulk(applicationUuid!, [
			{ key: "TEST_KEY", value: "updated_value", is_preview: false },
			{ key: "TEST_KEY_2", value: "new_value", is_preview: false },
		]);
		expect(Array.isArray(result)).toBe(true);
	});

	test("deleteEnv removes the env var", async () => {
		const { applicationUuid, appEnvUuid } = readState();
		const result = await client.deleteEnv(applicationUuid!, appEnvUuid!);
		expect(result).toHaveProperty("message");
	});
});
