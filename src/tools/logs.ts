import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CoolifyClient } from "../client";
import type { Config } from "../config";
import { filterLogs, type LogFilter, parseLogString } from "../lib/filters";
import * as schemas from "../lib/schemas";
import { wrap } from "../lib/wrap";

const logFilterSchema = {
	level: z
		.enum(["debug", "info", "warn", "error", "fatal"])
		.optional()
		.describe("Minimum log level to include"),
	since: z.string().optional().describe("ISO 8601 timestamp - only logs after this time"),
	until: z.string().optional().describe("ISO 8601 timestamp - only logs before this time"),
	search: z.string().optional().describe("Text to search for in log messages (case-insensitive)"),
	limit: z
		.number()
		.min(1)
		.max(1000)
		.default(100)
		.describe("Maximum number of log entries to fetch from the server"),
	tail: z.boolean().default(false).describe("Return the most recent logs (tail behavior)"),
};

function buildLogFilter(params: {
	level?: string;
	since?: string;
	until?: string;
	search?: string;
	limit: number;
	tail: boolean;
}): LogFilter {
	return {
		level: params.level as LogFilter["level"],
		since: params.since ? new Date(params.since) : undefined,
		until: params.until ? new Date(params.until) : undefined,
		search: params.search,
		limit: params.limit,
		tail: params.tail,
	};
}

function processLogs(rawLogs: unknown, filter: LogFilter, resourceType: string, uuid: string) {
	const logs = parseLogString(typeof rawLogs === "string" ? rawLogs : JSON.stringify(rawLogs));
	const filteredLogs = filterLogs(logs, filter);
	return {
		[`${resourceType}Uuid`]: uuid,
		totalLogs: logs.length,
		filteredCount: filteredLogs.length,
		filters: {
			level: filter.level,
			since: filter.since?.toISOString(),
			until: filter.until?.toISOString(),
			search: filter.search,
			limit: filter.limit,
			tail: filter.tail,
		},
		logs: filteredLogs,
	};
}

export function registerLogTools(server: McpServer, client: CoolifyClient, _config: Config) {
	server.tool(
		"coolify_get_logs",
		"Retrieve logs for a Coolify application with optional filtering by level, time range, or text search",
		{
			uuid: schemas.uuid.describe("UUID of the application"),
			...logFilterSchema,
		},
		async ({ uuid, level, since, until, search, limit, tail }) => {
			return wrap(async () => {
				const rawLogs = await client.getApplicationLogs(uuid, limit);
				const filter = buildLogFilter({ level, since, until, search, limit, tail });
				return processLogs(rawLogs, filter, "application", uuid);
			});
		},
	);

	server.tool(
		"coolify_get_database_logs",
		"Retrieve logs for a Coolify database with optional filtering by level, time range, or text search",
		{
			uuid: schemas.uuid.describe("UUID of the database"),
			...logFilterSchema,
		},
		async ({ uuid, level, since, until, search, limit, tail }) => {
			return wrap(async () => {
				const rawLogs = await client.getDatabaseLogs(uuid, limit);
				const filter = buildLogFilter({ level, since, until, search, limit, tail });
				return processLogs(rawLogs, filter, "database", uuid);
			});
		},
	);

	server.tool(
		"coolify_get_service_logs",
		"Retrieve logs for a Coolify service with optional filtering by level, time range, or text search",
		{
			uuid: schemas.uuid.describe("UUID of the service"),
			...logFilterSchema,
		},
		async ({ uuid, level, since, until, search, limit, tail }) => {
			return wrap(async () => {
				const rawLogs = await client.getServiceLogs(uuid, limit);
				const filter = buildLogFilter({ level, since, until, search, limit, tail });
				return processLogs(rawLogs, filter, "service", uuid);
			});
		},
	);
}
