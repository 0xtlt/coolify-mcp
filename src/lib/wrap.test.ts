import { describe, expect, it } from "bun:test";
import { CoolifyApiError, NetworkError } from "./errors";
import { errorResponse, formatError, textResponse, wrap, wrapWithActions } from "./wrap";

describe("formatError", () => {
	it("formats CoolifyApiError using toUserMessage", () => {
		const err = new CoolifyApiError("Not Found", 404);
		expect(formatError(err)).toBe("Resource not found. Check the ID provided.");
	});

	it("formats NetworkError", () => {
		const err = new NetworkError("timeout");
		expect(formatError(err)).toBe("Network error: timeout");
	});

	it("formats generic Error", () => {
		const err = new Error("something broke");
		expect(formatError(err)).toBe("Error: something broke");
	});

	it("formats unknown values", () => {
		expect(formatError("string error")).toBe("Unknown error: string error");
		expect(formatError(42)).toBe("Unknown error: 42");
	});
});

describe("wrap", () => {
	it("returns JSON content on success", async () => {
		const result = await wrap(async () => ({ name: "test" }));
		expect(result.isError).toBeUndefined();
		expect(JSON.parse(result.content[0].text)).toEqual({ name: "test" });
	});

	it("returns error content on failure", async () => {
		const result = await wrap(async () => {
			throw new CoolifyApiError("fail", 401);
		});
		expect(result.isError).toBe(true);
		expect(result.content[0].text).toContain("Authentication failed");
	});
});

describe("wrapWithActions", () => {
	it("includes _actions in response", async () => {
		const result = await wrapWithActions(
			async () => ({ status: "running" }),
			() => [{ tool: "stop", args: { uuid: "x" }, hint: "Stop it" }],
		);
		const parsed = JSON.parse(result.content[0].text);
		expect(parsed.data).toEqual({ status: "running" });
		expect(parsed._actions).toHaveLength(1);
		expect(parsed._actions[0].tool).toBe("stop");
	});

	it("omits _actions when no getter provided", async () => {
		const result = await wrapWithActions(async () => ({ name: "test" }));
		const parsed = JSON.parse(result.content[0].text);
		expect(parsed.data).toEqual({ name: "test" });
		expect(parsed._actions).toBeUndefined();
	});

	it("returns error on failure", async () => {
		const result = await wrapWithActions(async () => {
			throw new NetworkError("offline");
		});
		expect(result.isError).toBe(true);
		expect(result.content[0].text).toContain("Network error: offline");
	});
});

describe("textResponse", () => {
	it("returns text content", () => {
		const result = textResponse("hello");
		expect(result.content[0].text).toBe("hello");
		expect(result.isError).toBeUndefined();
	});
});

describe("errorResponse", () => {
	it("returns error content", () => {
		const result = errorResponse("bad");
		expect(result.content[0].text).toBe("bad");
		expect(result.isError).toBe(true);
	});
});
