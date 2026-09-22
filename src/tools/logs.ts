import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CoolifyClient } from "../client";
import type { Config } from "../config";
import { filterLogs, type LogFilter, parseLogString } from "../lib/filters";
import * as schemas from "../lib/schemas";
import { wrap } from "../lib/wrap";

const logFilterSchema = {
	lines: z
		.union([z.number().int().min(-1).max(10000), z.literal("all")])
		.optional()
		.describe(
			"Server log lines to fetch; all (or -1) fetches all. Defaults to limit. Filtering still caps the returned entries at limit.",
		),
	show_timestamps: z
		.boolean()
		.default(true)
		.describe("Include server timestamps for accurate time filtering"),
	level: z
		.enum(["debug", "info", "warn", "error", "fatal"])
		.optional()
		.describe("Minimum log level to include"),
	since: z.string().optional().describe("ISO 8601 timestamp - only logs after this time"),
	until: z.string().optional().describe("ISO 8601 timestamp - only logs before this time"),
	search: z.string().optional().describe("Text to search for in log messages (case-insensitive)"),
	limit: z
		.number()
		.int()
		.min(1)
		.max(1000)
		.default(100)
		.describe("Maximum number of filtered log entries to return"),
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
		"coolify_get_application_preview_logs",
		"Retrieve runtime container logs for an application preview by pull request number (Coolify v4.3.23), with level/time/text filtering.",
		{ uuid: schemas.uuid, pull_request_id: schemas.numericId, ...logFilterSchema },
		async ({
			uuid,
			pull_request_id,
			lines,
			show_timestamps,
			level,
			since,
			until,
			search,
			limit,
			tail,
		}) =>
			wrap(async () => {
				const rawLogs = await client.getApplicationPreviewLogs(
					uuid,
					pull_request_id,
					lines ?? limit,
					show_timestamps,
				);
				return {
					...processLogs(
						rawLogs,
						buildLogFilter({ level, since, until, search, limit, tail }),
						"application",
						uuid,
					),
					pull_request_id,
				};
			}),
	);

	server.tool(
		"coolify_get_logs",
		"Retrieve logs for a Coolify application with optional filtering by level, time range, or text search",
		{
			uuid: schemas.uuid.describe("UUID of the application"),
			...logFilterSchema,
		},
		async ({ uuid, lines, show_timestamps, level, since, until, search, limit, tail }) => {
			return wrap(async () => {
				const rawLogs = await client.getApplicationLogs(uuid, lines ?? limit, show_timestamps);
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
		async ({ uuid, lines, show_timestamps, level, since, until, search, limit, tail }) => {
			return wrap(async () => {
				const rawLogs = await client.getDatabaseLogs(uuid, lines ?? limit, show_timestamps);
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
		async ({ uuid, lines, show_timestamps, level, since, until, search, limit, tail }) => {
			return wrap(async () => {
				const rawLogs = await client.getServiceLogs(uuid, lines ?? limit, show_timestamps);
				const filter = buildLogFilter({ level, since, until, search, limit, tail });
				return processLogs(rawLogs, filter, "service", uuid);
			});
		},
	);
}
