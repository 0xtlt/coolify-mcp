import { describe, expect, it } from "bun:test";
import { ConfigurationError, CoolifyApiError, CoolifyMcpError, NetworkError } from "./errors";

describe("CoolifyApiError", () => {
	describe("toUserMessage", () => {
		it("returns auth message for 401", () => {
			const err = new CoolifyApiError("Unauthorized", 401);
			expect(err.toUserMessage()).toBe("Authentication failed. Check your COOLIFY_TOKEN.");
		});

		it("returns access denied message for 403", () => {
			const err = new CoolifyApiError("Forbidden", 403);
			expect(err.toUserMessage()).toBe("Access denied. Insufficient permissions.");
		});

		it("returns not found message for 404", () => {
			const err = new CoolifyApiError("Not Found", 404);
			expect(err.toUserMessage()).toBe("Resource not found. Check the ID provided.");
		});

		it("returns rate limit message for 429", () => {
			const err = new CoolifyApiError("Too Many Requests", 429);
			expect(err.toUserMessage()).toBe("Rate limit exceeded. Try again later.");
		});

		it("returns generic message for other status codes", () => {
			const err = new CoolifyApiError("Server Error", 500);
			expect(err.toUserMessage()).toBe("API error (500): Server Error");
		});

		it("includes response body when present", () => {
			const err = new CoolifyApiError("Not Found", 404, '{"error":"app not found"}');
			expect(err.toUserMessage()).toBe(
				'Resource not found. Check the ID provided. Response: {"error":"app not found"}',
			);
		});
	});

	it("has correct properties", () => {
		const err = new CoolifyApiError("msg", 404, "body");
		expect(err.statusCode).toBe(404);
		expect(err.responseBody).toBe("body");
		expect(err.code).toBe("API_ERROR");
		expect(err.name).toBe("CoolifyApiError");
	});
});

describe("error class hierarchy", () => {
	it("CoolifyApiError extends CoolifyMcpError extends Error", () => {
		const err = new CoolifyApiError("test", 500);
		expect(err).toBeInstanceOf(CoolifyApiError);
		expect(err).toBeInstanceOf(CoolifyMcpError);
		expect(err).toBeInstanceOf(Error);
	});

	it("NetworkError extends CoolifyMcpError", () => {
		const err = new NetworkError("timeout");
		expect(err).toBeInstanceOf(NetworkError);
		expect(err).toBeInstanceOf(CoolifyMcpError);
		expect(err.code).toBe("NETWORK_ERROR");
	});

	it("ConfigurationError extends CoolifyMcpError", () => {
		const err = new ConfigurationError("missing token");
		expect(err).toBeInstanceOf(ConfigurationError);
		expect(err).toBeInstanceOf(CoolifyMcpError);
		expect(err.code).toBe("CONFIG_ERROR");
	});
});
