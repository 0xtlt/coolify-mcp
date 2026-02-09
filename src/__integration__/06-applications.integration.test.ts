import { describe, expect, test } from "bun:test";
import { createTestClient, readState, updateState } from "./setup";

const client = createTestClient();

describe("06 - Applications", () => {
	test("createApplication creates a dockerimage app", async () => {
		const { serverUuid, projectUuid, environmentName } = readState();
		const result = await client.createApplication("dockerimage", {
			server_uuid: serverUuid!,
			project_uuid: projectUuid!,
			environment_name: environmentName ?? "production",
			docker_registry_image_name: "nginx",
			docker_registry_image_tag: "alpine",
			name: "integration-test-app",
			description: "Created by integration tests",
			ports_exposes: "80",
			instant_deploy: false,
		});
		expect(result).toHaveProperty("uuid");
		expect(result.uuid.length).toBeGreaterThan(0);
		updateState({ applicationUuid: result.uuid });
	});

	test("listApplications includes the created app", async () => {
		const apps = await client.listApplications();
		expect(Array.isArray(apps)).toBe(true);
		const { applicationUuid } = readState();
		const found = apps.find((a) => a.uuid === applicationUuid);
		expect(found).toBeDefined();
	});

	test("getApplication returns app details", async () => {
		const { applicationUuid } = readState();
		const app = await client.getApplication(applicationUuid!);
		expect(app.uuid).toBe(applicationUuid!);
		expect(app.name).toBe("integration-test-app");
	});

	test("updateApplication renames the app", async () => {
		const { applicationUuid } = readState();
		const result = await client.updateApplication(applicationUuid!, {
			name: "integration-test-app-updated",
		});
		expect(result).toHaveProperty("uuid");
	});
});
