import { describe, expect, test } from "bun:test";
import { createTestClient, readState, updateState } from "./setup";

const client = createTestClient();

describe("03 - Projects", () => {
	test("createProject creates a test project", async () => {
		const result = await client.createProject({
			name: "integration-test-project",
			description: "Created by integration tests",
		});
		expect(result).toHaveProperty("uuid");
		expect(result.uuid.length).toBeGreaterThan(0);
		updateState({ projectUuid: result.uuid });
	});

	test("listProjects includes the created project", async () => {
		const projects = await client.listProjects();
		expect(Array.isArray(projects)).toBe(true);
		const { projectUuid } = readState();
		const found = projects.find((p) => p.uuid === projectUuid);
		expect(found).toBeDefined();
	});

	test("getProject returns the created project", async () => {
		const { projectUuid } = readState();
		const project = await client.getProject(projectUuid!);
		expect(project.uuid).toBe(projectUuid!);
		expect(project.name).toBe("integration-test-project");
	});

	test("updateProject renames the project", async () => {
		const { projectUuid } = readState();
		const result = await client.updateProject(projectUuid!, {
			name: "integration-test-project-updated",
		});
		expect(result).toHaveProperty("uuid");
	});

	test("createEnvironment creates a test env", async () => {
		const { projectUuid } = readState();
		const result = await client.createEnvironment(projectUuid!, {
			name: "staging",
		});
		expect(result).toHaveProperty("uuid");
		updateState({ environmentName: "staging" });
	});

	test("listEnvironments includes both production and staging", async () => {
		const { projectUuid } = readState();
		const envs = await client.listEnvironments(projectUuid!);
		expect(Array.isArray(envs)).toBe(true);
		expect(envs.length).toBeGreaterThanOrEqual(2);
		const names = envs.map((e) => e.name);
		expect(names).toContain("production");
		expect(names).toContain("staging");
	});

	test("getEnvironment returns production env details", async () => {
		const { projectUuid } = readState();
		const env = await client.getEnvironment(projectUuid!, "production");
		expect(env).toHaveProperty("name");
		expect(env.name).toBe("production");
	});
});
