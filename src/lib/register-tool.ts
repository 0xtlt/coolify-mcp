import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import type { Config } from "../config";
import { checkConfirmation, isToolAllowed, readonlyError } from "./safety";
import { errorResponse, wrap } from "./wrap";

export function registerApiTool<T extends Record<string, unknown>>(
	server: McpServer,
	config: Config,
	name: string,
	description: string,
	shape: ZodRawShape,
	handler: (args: T) => Promise<unknown>,
): void {
	if (!isToolAllowed(name, config)) return;
	server.tool(name, description, shape, async (args) => {
		if (!isToolAllowed(name, config)) return readonlyError(name);
		const record = args as Record<string, unknown>;
		const check = checkConfirmation(name, record, config);
		if (!check.proceed) return check.response ?? errorResponse("Confirmation required.");
		return wrap(() => handler(args as T));
	});
}

export function definedRecord(data: Record<string, unknown>): Record<string, unknown> {
	return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
}
