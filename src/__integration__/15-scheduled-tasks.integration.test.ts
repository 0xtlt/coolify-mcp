import { describe, expect, test } from "bun:test";
import { createTestClient, readState } from "./setup";

const client = createTestClient();

describe("15 - Scheduled Tasks", () => {
	let taskUuid: string;

	test("createApplicationScheduledTask creates a task", async () => {
		const { applicationUuid } = readState();
		if (!applicationUuid) return;
		const result = await client.createApplicationScheduledTask(applicationUuid, {
			name: "integration-test-task",
			command: "echo hello",
			frequency: "* * * * *",
			enabled: false,
		});
		expect(result).toHaveProperty("uuid");
		expect(result.uuid.length).toBeGreaterThan(0);
		taskUuid = result.uuid;
	});

	test("listApplicationScheduledTasks includes the created task", async () => {
		const { applicationUuid } = readState();
		if (!applicationUuid) return;
		const tasks = await client.listApplicationScheduledTasks(applicationUuid);
		expect(Array.isArray(tasks)).toBe(true);
		const found = tasks.find((t) => t.uuid === taskUuid);
		expect(found).toBeDefined();
		expect(found?.name).toBe("integration-test-task");
	});

	test("updateApplicationScheduledTask updates the task", async () => {
		const { applicationUuid } = readState();
		if (!applicationUuid || !taskUuid) return;
		const result = await client.updateApplicationScheduledTask(applicationUuid, taskUuid, {
			name: "integration-test-task-updated",
		});
		expect(result).toBeDefined();
	});

	test("listApplicationScheduledTaskExecutions returns an array", async () => {
		const { applicationUuid } = readState();
		if (!applicationUuid || !taskUuid) return;
		const executions = await client.listApplicationScheduledTaskExecutions(
			applicationUuid,
			taskUuid,
		);
		expect(Array.isArray(executions)).toBe(true);
	});

	test("deleteApplicationScheduledTask deletes the task", async () => {
		const { applicationUuid } = readState();
		if (!applicationUuid || !taskUuid) return;
		const result = await client.deleteApplicationScheduledTask(applicationUuid, taskUuid);
		expect(result).toBeDefined();
	});
});
