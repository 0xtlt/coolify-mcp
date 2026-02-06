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
