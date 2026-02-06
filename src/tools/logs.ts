import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CoolifyClient } from "../client";
import type { Config } from "../config";
import { filterLogs, type LogFilter, parseLogString } from "../lib/filters";
import * as schemas from "../lib/schemas";
import { wrap } from "../lib/wrap";

export function registerLogTools(server: McpServer, client: CoolifyClient, _config: Config) {
	server.tool(
		"coolify_get_logs",
		"Retrieve logs for a Coolify application with optional filtering by level, time range, or text search",
		{
			uuid: schemas.uuid.describe("UUID of the application"),
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
			limit: z
				.number()
				.min(1)
				.max(1000)
				.default(100)
				.describe("Maximum number of log entries to fetch from the server"),
			tail: z.boolean().default(false).describe("Return the most recent logs (tail behavior)"),
		},
		async ({ uuid, level, since, until, search, limit, tail }) => {
			return wrap(async () => {
				const rawLogs = await client.getApplicationLogs(uuid, limit);
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
					applicationUuid: uuid,
					totalLogs: logs.length,
					filteredCount: filteredLogs.length,
					filters: { level, since, until, search, limit, tail },
					logs: filteredLogs,
				};
			});
		},
	);
}
