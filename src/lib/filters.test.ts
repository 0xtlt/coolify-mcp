import { describe, expect, it } from "bun:test";
import type { DeploymentLog } from "../types/api";
import { filterLogs, parseLogString } from "./filters";

describe("parseLogString", () => {
	it("parses Coolify JSON format", () => {
		const raw = JSON.stringify({
			logs: "[12:00:00] INFO: Server started\n[12:00:01] ERROR: Connection lost",
		});
		const result = parseLogString(raw);
		expect(result).toHaveLength(2);
		expect(result[0].level).toBe("info");
		expect(result[0].message).toBe("Server started");
		expect(result[1].level).toBe("error");
		expect(result[1].message).toBe("Connection lost");
	});

	it("parses Coolify bracket format without JSON wrapper", () => {
		const raw = "[09:30:15] WARN: High memory usage";
		const result = parseLogString(raw);
		expect(result).toHaveLength(1);
		expect(result[0].level).toBe("warn");
		expect(result[0].message).toBe("High memory usage");
	});

	it("parses ISO timestamp format with level", () => {
		const raw = "2024-01-15T10:30:00Z WARN: Disk almost full";
		const result = parseLogString(raw);
		expect(result).toHaveLength(1);
		expect(result[0].timestamp).toBe("2024-01-15T10:30:00Z");
		expect(result[0].level).toBe("warn");
		expect(result[0].message).toBe("Disk almost full");
	});

	it("parses ISO timestamp without level", () => {
		const raw = "2024-01-15T10:30:00Z some plain message";
		const result = parseLogString(raw);
		expect(result).toHaveLength(1);
		expect(result[0].timestamp).toBe("2024-01-15T10:30:00Z");
		expect(result[0].message).toBe("some plain message");
		expect(result[0].level).toBeUndefined();
	});

	it("falls back to plain text for unstructured lines", () => {
		const raw = "just a plain log line";
		const result = parseLogString(raw);
		expect(result).toHaveLength(1);
		expect(result[0].message).toBe("just a plain log line");
	});

	it("returns empty array for empty input", () => {
		expect(parseLogString("")).toEqual([]);
	});

	it("handles multi-line input with mixed formats", () => {
		const raw = "[10:00:00] INFO: first\nplain line\n[10:00:02] ERROR: third";
		const result = parseLogString(raw);
		expect(result).toHaveLength(3);
		expect(result[0].level).toBe("info");
		expect(result[1].message).toBe("plain line");
		expect(result[2].level).toBe("error");
	});

	it("skips empty lines", () => {
		const raw = "[10:00:00] INFO: first\n\n\n[10:00:01] INFO: second";
		const result = parseLogString(raw);
		expect(result).toHaveLength(2);
	});
});

describe("filterLogs", () => {
	const baseLogs: DeploymentLog[] = [
		{ timestamp: "2024-01-01T10:00:00Z", level: "debug", message: "Debug msg" },
		{ timestamp: "2024-01-01T11:00:00Z", level: "info", message: "Info msg" },
		{ timestamp: "2024-01-01T12:00:00Z", level: "warn", message: "Warning about disk" },
		{ timestamp: "2024-01-01T13:00:00Z", level: "error", message: "Error occurred" },
		{ timestamp: "2024-01-01T14:00:00Z", level: "fatal", message: "Fatal crash" },
	];

	it("returns all logs when no level filter", () => {
		const result = filterLogs(baseLogs, { limit: 100, tail: false });
		expect(result).toHaveLength(5);
	});

	it("filters by minimum log level", () => {
		const result = filterLogs(baseLogs, { level: "warn", limit: 100, tail: false });
		expect(result).toHaveLength(3);
		expect(result.map((l) => l.level)).toEqual(["warn", "error", "fatal"]);
	});

	it("filters by since date", () => {
		const result = filterLogs(baseLogs, {
			since: new Date("2024-01-01T12:00:00Z"),
			limit: 100,
			tail: false,
		});
		expect(result).toHaveLength(3);
		expect(result[0].level).toBe("warn");
	});

	it("filters by until date", () => {
		const result = filterLogs(baseLogs, {
			until: new Date("2024-01-01T11:00:00Z"),
			limit: 100,
			tail: false,
		});
		expect(result).toHaveLength(2);
		expect(result[1].level).toBe("info");
	});

	it("filters by since and until combined", () => {
		const result = filterLogs(baseLogs, {
			since: new Date("2024-01-01T11:00:00Z"),
			until: new Date("2024-01-01T13:00:00Z"),
			limit: 100,
			tail: false,
		});
		expect(result).toHaveLength(3);
	});

	it("filters by text search case-insensitively", () => {
		const result = filterLogs(baseLogs, { search: "DISK", limit: 100, tail: false });
		expect(result).toHaveLength(1);
		expect(result[0].message).toBe("Warning about disk");
	});

	it("applies limit with tail: false (head)", () => {
		const result = filterLogs(baseLogs, { limit: 2, tail: false });
		expect(result).toHaveLength(2);
		expect(result[0].level).toBe("debug");
		expect(result[1].level).toBe("info");
	});

	it("applies limit with tail: true (last N)", () => {
		const result = filterLogs(baseLogs, { limit: 2, tail: true });
		expect(result).toHaveLength(2);
		expect(result[0].level).toBe("error");
		expect(result[1].level).toBe("fatal");
	});

	it("combines multiple filters", () => {
		const result = filterLogs(baseLogs, {
			level: "info",
			search: "msg",
			limit: 1,
			tail: true,
		});
		expect(result).toHaveLength(1);
		expect(result[0].level).toBe("info");
	});

	it("returns empty array when no logs match", () => {
		const result = filterLogs(baseLogs, { search: "nonexistent", limit: 100, tail: false });
		expect(result).toHaveLength(0);
	});

	it("handles empty input array", () => {
		const result = filterLogs([], { limit: 100, tail: false });
		expect(result).toHaveLength(0);
	});
});
