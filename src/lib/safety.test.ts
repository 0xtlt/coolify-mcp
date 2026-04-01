import { describe, expect, it } from "bun:test";
import type { Config } from "../config";
import { checkConfirmation, isToolAllowed, readonlyError } from "./safety";

const baseConfig: Config = {
	coolifyApiUrl: "https://example.com",
	coolifyToken: "token",
	timeout: 5000,
	debug: false,
	readonly: false,
	requireConfirm: false,
};

describe("isToolAllowed", () => {
	it("allows all tools when readonly is false", () => {
		expect(isToolAllowed("coolify_stop_application", baseConfig)).toBe(true);
		expect(isToolAllowed("coolify_list_applications", baseConfig)).toBe(true);
	});

	it("blocks write tools in readonly mode", () => {
		const config = { ...baseConfig, readonly: true };
		expect(isToolAllowed("coolify_start_application", config)).toBe(false);
		expect(isToolAllowed("coolify_trigger_deploy", config)).toBe(false);
	});

	it("blocks destructive tools in readonly mode", () => {
		const config = { ...baseConfig, readonly: true };
		expect(isToolAllowed("coolify_stop_application", config)).toBe(false);
		expect(isToolAllowed("coolify_restart_application", config)).toBe(false);
	});

	it("allows read tools in readonly mode", () => {
		const config = { ...baseConfig, readonly: true };
		expect(isToolAllowed("coolify_list_applications", config)).toBe(true);
		expect(isToolAllowed("coolify_get_application", config)).toBe(true);
		expect(isToolAllowed("coolify_get_logs", config)).toBe(true);
	});

	// Phase 4 tools
	it("blocks private key write/destructive in readonly mode", () => {
		const config = { ...baseConfig, readonly: true };
		expect(isToolAllowed("coolify_create_private_key", config)).toBe(false);
		expect(isToolAllowed("coolify_update_private_key", config)).toBe(false);
		expect(isToolAllowed("coolify_delete_private_key", config)).toBe(false);
	});

	it("allows private key read tools in readonly mode", () => {
		const config = { ...baseConfig, readonly: true };
		expect(isToolAllowed("coolify_list_private_keys", config)).toBe(true);
		expect(isToolAllowed("coolify_get_private_key", config)).toBe(true);
	});

	it("blocks server write/destructive in readonly mode", () => {
		const config = { ...baseConfig, readonly: true };
		expect(isToolAllowed("coolify_create_server", config)).toBe(false);
		expect(isToolAllowed("coolify_update_server", config)).toBe(false);
		expect(isToolAllowed("coolify_delete_server", config)).toBe(false);
	});

	it("blocks environment write/destructive in readonly mode", () => {
		const config = { ...baseConfig, readonly: true };
		expect(isToolAllowed("coolify_create_environment", config)).toBe(false);
		expect(isToolAllowed("coolify_delete_environment", config)).toBe(false);
	});

	it("blocks service env write/destructive in readonly mode", () => {
		const config = { ...baseConfig, readonly: true };
		expect(isToolAllowed("coolify_create_service_env", config)).toBe(false);
		expect(isToolAllowed("coolify_update_service_envs_bulk", config)).toBe(false);
		expect(isToolAllowed("coolify_delete_service_env", config)).toBe(false);
		expect(isToolAllowed("coolify_list_service_envs", config)).toBe(true);
	});

	// Phase 5 tools
	it("blocks database env write/destructive in readonly mode", () => {
		const config = { ...baseConfig, readonly: true };
		expect(isToolAllowed("coolify_create_database_env", config)).toBe(false);
		expect(isToolAllowed("coolify_update_database_envs_bulk", config)).toBe(false);
		expect(isToolAllowed("coolify_delete_database_env", config)).toBe(false);
		expect(isToolAllowed("coolify_list_database_envs", config)).toBe(true);
	});

	it("allows application deployments read in readonly mode", () => {
		const config = { ...baseConfig, readonly: true };
		expect(isToolAllowed("coolify_list_application_deployments", config)).toBe(true);
	});

	it("allows database/service log read in readonly mode", () => {
		const config = { ...baseConfig, readonly: true };
		expect(isToolAllowed("coolify_get_database_logs", config)).toBe(true);
		expect(isToolAllowed("coolify_get_service_logs", config)).toBe(true);
	});

	it("blocks backup write/destructive in readonly mode", () => {
		const config = { ...baseConfig, readonly: true };
		expect(isToolAllowed("coolify_create_database_backup", config)).toBe(false);
		expect(isToolAllowed("coolify_delete_database_backup", config)).toBe(false);
	});

	// Scheduled Tasks
	it("blocks scheduled task write/destructive in readonly mode", () => {
		const config = { ...baseConfig, readonly: true };
		expect(isToolAllowed("coolify_create_application_scheduled_task", config)).toBe(false);
		expect(isToolAllowed("coolify_update_application_scheduled_task", config)).toBe(false);
		expect(isToolAllowed("coolify_delete_application_scheduled_task", config)).toBe(false);
		expect(isToolAllowed("coolify_create_service_scheduled_task", config)).toBe(false);
		expect(isToolAllowed("coolify_delete_service_scheduled_task", config)).toBe(false);
	});

	it("allows scheduled task read tools in readonly mode", () => {
		const config = { ...baseConfig, readonly: true };
		expect(isToolAllowed("coolify_list_application_scheduled_tasks", config)).toBe(true);
		expect(isToolAllowed("coolify_list_application_scheduled_task_executions", config)).toBe(true);
		expect(isToolAllowed("coolify_list_service_scheduled_tasks", config)).toBe(true);
		expect(isToolAllowed("coolify_list_service_scheduled_task_executions", config)).toBe(true);
	});

	// Storages
	it("blocks storage write/destructive in readonly mode", () => {
		const config = { ...baseConfig, readonly: true };
		expect(isToolAllowed("coolify_create_application_storage", config)).toBe(false);
		expect(isToolAllowed("coolify_update_application_storage", config)).toBe(false);
		expect(isToolAllowed("coolify_delete_application_storage", config)).toBe(false);
		expect(isToolAllowed("coolify_create_database_storage", config)).toBe(false);
		expect(isToolAllowed("coolify_delete_database_storage", config)).toBe(false);
		expect(isToolAllowed("coolify_create_service_storage", config)).toBe(false);
		expect(isToolAllowed("coolify_delete_service_storage", config)).toBe(false);
	});

	it("allows storage read tools in readonly mode", () => {
		const config = { ...baseConfig, readonly: true };
		expect(isToolAllowed("coolify_list_application_storages", config)).toBe(true);
		expect(isToolAllowed("coolify_list_database_storages", config)).toBe(true);
		expect(isToolAllowed("coolify_list_service_storages", config)).toBe(true);
	});

	// GitHub Apps
	it("blocks github app write/destructive in readonly mode", () => {
		const config = { ...baseConfig, readonly: true };
		expect(isToolAllowed("coolify_create_github_app", config)).toBe(false);
		expect(isToolAllowed("coolify_update_github_app", config)).toBe(false);
		expect(isToolAllowed("coolify_delete_github_app", config)).toBe(false);
	});

	it("allows github app read tools in readonly mode", () => {
		const config = { ...baseConfig, readonly: true };
		expect(isToolAllowed("coolify_list_github_apps", config)).toBe(true);
		expect(isToolAllowed("coolify_list_github_app_repositories", config)).toBe(true);
		expect(isToolAllowed("coolify_list_github_app_branches", config)).toBe(true);
	});

	// Backup Executions & Update
	it("blocks backup execution destructive and backup update in readonly mode", () => {
		const config = { ...baseConfig, readonly: true };
		expect(isToolAllowed("coolify_delete_backup_execution", config)).toBe(false);
		expect(isToolAllowed("coolify_update_database_backup", config)).toBe(false);
	});

	it("allows backup execution read and resources list in readonly mode", () => {
		const config = { ...baseConfig, readonly: true };
		expect(isToolAllowed("coolify_list_backup_executions", config)).toBe(true);
		expect(isToolAllowed("coolify_list_resources", config)).toBe(true);
	});

	it("allows unknown tools by default", () => {
		expect(isToolAllowed("unknown_tool", baseConfig)).toBe(true);
	});
});

describe("checkConfirmation", () => {
	it("proceeds when requireConfirm is false", () => {
		const result = checkConfirmation("coolify_stop_application", {}, baseConfig);
		expect(result.proceed).toBe(true);
	});

	it("proceeds for non-destructive tools even with requireConfirm", () => {
		const config = { ...baseConfig, requireConfirm: true };
		const result = checkConfirmation("coolify_start_application", {}, config);
		expect(result.proceed).toBe(true);
	});

	it("blocks destructive tools without confirm when requireConfirm is true", () => {
		const config = { ...baseConfig, requireConfirm: true };
		const result = checkConfirmation("coolify_stop_application", { uuid: "abc" }, config);
		expect(result.proceed).toBe(false);
		expect(result.response).toBeDefined();
		const text = result.response!.content[0].text;
		expect(text).toContain("confirmation_required");
		expect(text).toContain("coolify_stop_application");
	});

	// Phase 5 confirmation tests
	it("requires confirmation for delete_database_env", () => {
		const config = { ...baseConfig, requireConfirm: true };
		const result = checkConfirmation(
			"coolify_delete_database_env",
			{ uuid: "db-1", env_uuid: "e-1" },
			config,
		);
		expect(result.proceed).toBe(false);
		expect(result.response).toBeDefined();
	});

	it("requires confirmation for delete_database_backup", () => {
		const config = { ...baseConfig, requireConfirm: true };
		const result = checkConfirmation(
			"coolify_delete_database_backup",
			{ uuid: "db-1", backup_id: 1 },
			config,
		);
		expect(result.proceed).toBe(false);
		expect(result.response).toBeDefined();
	});

	it("does not require confirmation for create_database_backup (write level)", () => {
		const config = { ...baseConfig, requireConfirm: true };
		const result = checkConfirmation("coolify_create_database_backup", { uuid: "db-1" }, config);
		expect(result.proceed).toBe(true);
	});

	it("does not require confirmation for database env bulk update (write level)", () => {
		const config = { ...baseConfig, requireConfirm: true };
		const result = checkConfirmation("coolify_update_database_envs_bulk", { uuid: "db-1" }, config);
		expect(result.proceed).toBe(true);
	});

	it("requires confirmation for delete_application_scheduled_task", () => {
		const config = { ...baseConfig, requireConfirm: true };
		const result = checkConfirmation(
			"coolify_delete_application_scheduled_task",
			{ uuid: "app-1", task_uuid: "task-1" },
			config,
		);
		expect(result.proceed).toBe(false);
		expect(result.response).toBeDefined();
	});

	it("requires confirmation for delete_application_storage", () => {
		const config = { ...baseConfig, requireConfirm: true };
		const result = checkConfirmation(
			"coolify_delete_application_storage",
			{ uuid: "app-1", storage_uuid: "stor-1" },
			config,
		);
		expect(result.proceed).toBe(false);
		expect(result.response).toBeDefined();
	});

	it("requires confirmation for delete_github_app", () => {
		const config = { ...baseConfig, requireConfirm: true };
		const result = checkConfirmation("coolify_delete_github_app", { id: 42 }, config);
		expect(result.proceed).toBe(false);
		expect(result.response).toBeDefined();
	});

	it("requires confirmation for delete_backup_execution", () => {
		const config = { ...baseConfig, requireConfirm: true };
		const result = checkConfirmation(
			"coolify_delete_backup_execution",
			{ uuid: "db-1", backup_uuid: "b-1", execution_uuid: "e-1" },
			config,
		);
		expect(result.proceed).toBe(false);
		expect(result.response).toBeDefined();
	});

	it("does not require confirmation for write-level scheduled task/storage tools", () => {
		const config = { ...baseConfig, requireConfirm: true };
		expect(
			checkConfirmation("coolify_create_application_scheduled_task", { uuid: "app-1" }, config)
				.proceed,
		).toBe(true);
		expect(
			checkConfirmation("coolify_create_application_storage", { uuid: "app-1" }, config).proceed,
		).toBe(true);
		expect(
			checkConfirmation("coolify_update_database_backup", { uuid: "db-1" }, config).proceed,
		).toBe(true);
	});

	it("proceeds for destructive tools with confirm: true", () => {
		const config = { ...baseConfig, requireConfirm: true };
		const result = checkConfirmation(
			"coolify_stop_application",
			{ uuid: "abc", confirm: true },
			config,
		);
		expect(result.proceed).toBe(true);
	});
});

describe("readonlyError", () => {
	it("returns error with tool name", () => {
		const result = readonlyError("coolify_stop_application");
		expect(result.isError).toBe(true);
		expect(result.content[0].text).toContain("coolify_stop_application");
		expect(result.content[0].text).toContain("COOLIFY_READONLY");
	});
});
