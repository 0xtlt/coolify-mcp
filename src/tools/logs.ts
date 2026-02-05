import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CoolifyClient } from "../client";
import { CoolifyApiError, NetworkError } from "../lib/errors";
import { filterLogs, type LogFilter, parseLogString } from "../lib/filters";

function formatError(error: unknown): string {
	if (error instanceof CoolifyApiError) {
		return error.toUserMessage();
	}
	if (error instanceof NetworkError) {
		return `Network error: ${error.message}`;
	}
	if (error instanceof Error) {
		return `Error: ${error.message}`;
	}
	return `Unknown error: ${String(error)}`;
}

export function registerLogTools(server: McpServer, client: CoolifyClient) {
	server.tool(
		"coolify_get_logs",
		"Retrieve logs for a Coolify application with optional filtering by level, time range, or text search",
		{
			uuid: z.string().describe("UUID of the application"),
			level: z
				.enum(["debug", "info", "warn", "error", "fatal"])
				.optional()
				.describe("Minimum log level to include"),
			since: z.string().optional().describe("ISO 8601 timestamp - only logs after this time"),
			until: z.string().optional().describe("ISO 8601 timestamp - only logs before this time"),
			search: z
				.string()
				.optional()
				.describe("Text to search for in log messages (case-insensitive)"),
			limit: z.number().min(1).max(1000).default(100).describe("Maximum number of log entries"),
			tail: z.boolean().default(false).describe("Return the most recent logs (tail behavior)"),
		},
		async ({ uuid, level, since, until, search, limit, tail }) => {
			try {
				const rawLogs = await client.getApplicationLogs(uuid);
				const logs = parseLogString(
					typeof rawLogs === "string" ? rawLogs : JSON.stringify(rawLogs),
				);

				const filter: LogFilter = {
					level: level as LogFilter["level"],
					since: since ? new Date(since) : undefined,
					until: until ? new Date(until) : undefined,
					search,
					limit,
					tail,
				};

				const filteredLogs = filterLogs(logs, filter);

				return {
					content: [
						{
							type: "text",
							text: JSON.stringify(
								{
									applicationUuid: uuid,
									totalLogs: logs.length,
									filteredCount: filteredLogs.length,
									filters: { level, since, until, search, limit, tail },
									logs: filteredLogs,
								},
								null,
								2,
							),
						},
					],
				};
			} catch (error) {
				return {
					content: [{ type: "text", text: formatError(error) }],
					isError: true,
				};
			}
		},
	);
}
