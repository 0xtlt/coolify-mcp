import { describe, expect, it } from "bun:test";
import { validateConfig } from "./config";

describe("validateConfig", () => {
	it("returns config with all valid fields", () => {
		const config = validateConfig({
			coolifyApiUrl: "https://coolify.example.com/api/v1",
			coolifyToken: "my-token",
			timeout: 5000,
			debug: true,
		});
		expect(config.coolifyApiUrl).toBe("https://coolify.example.com/api/v1");
		expect(config.coolifyToken).toBe("my-token");
		expect(config.timeout).toBe(5000);
		expect(config.debug).toBe(true);
	});

	it("applies defaults for optional fields", () => {
		const config = validateConfig({
			coolifyApiUrl: "https://coolify.example.com/api/v1",
			coolifyToken: "my-token",
		});
		expect(config.timeout).toBe(30000);
		expect(config.debug).toBe(false);
		expect(config.readonly).toBe(false);
		expect(config.requireConfirm).toBe(false);
	});

	it("accepts readonly and requireConfirm", () => {
		const config = validateConfig({
			coolifyApiUrl: "https://coolify.example.com/api/v1",
			coolifyToken: "my-token",
			readonly: true,
			requireConfirm: true,
		});
		expect(config.readonly).toBe(true);
		expect(config.requireConfirm).toBe(true);
	});

	it("throws on missing coolifyApiUrl", () => {
		expect(() =>
			validateConfig({
				coolifyToken: "my-token",
			}),
		).toThrow();
	});

	it("throws on missing coolifyToken", () => {
		expect(() =>
			validateConfig({
				coolifyApiUrl: "https://coolify.example.com/api/v1",
			}),
		).toThrow();
	});

	it("throws on invalid URL", () => {
		expect(() =>
			validateConfig({
				coolifyApiUrl: "not-a-url",
				coolifyToken: "my-token",
			}),
		).toThrow();
	});

	it("throws on empty token", () => {
		expect(() =>
			validateConfig({
				coolifyApiUrl: "https://coolify.example.com/api/v1",
				coolifyToken: "",
			}),
		).toThrow();
	});
});
