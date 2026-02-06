import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CoolifyClient } from "../client";
import type { Config } from "../config";
import { isToolAllowed, readonlyError } from "../lib/safety";
import * as schemas from "../lib/schemas";
import { wrap } from "../lib/wrap";

export function registerExecuteTools(server: McpServer, client: CoolifyClient, config: Config) {
	if (isToolAllowed("coolify_execute_command_application", config)) {
		server.tool(
			"coolify_execute_command_application",
			"[WRITE] Execute a shell command inside a running Coolify application container",
			{
				uuid: schemas.uuid.describe("UUID of the application"),
				command: z.string().min(1).describe("Shell command to execute inside the container"),
			},
			async ({ uuid, command }) => {
				if (!isToolAllowed("coolify_execute_command_application", config))
					return readonlyError("coolify_execute_command_application");
				return wrap(async () => {
					const result = await client.executeCommandApplication(uuid, command);
					return { command, output: result.result };
				});
			},
		);
	}

	if (isToolAllowed("coolify_execute_command_server", config)) {
		server.tool(
			"coolify_execute_command_server",
			"[WRITE] Execute a shell command on a Coolify server via SSH",
			{
				uuid: schemas.uuid.describe("UUID of the server"),
				command: z.string().min(1).describe("Shell command to execute on the server"),
			},
			async ({ uuid, command }) => {
				if (!isToolAllowed("coolify_execute_command_server", config))
					return readonlyError("coolify_execute_command_server");
				return wrap(async () => {
					const result = await client.executeCommandServer(uuid, command);
					return { command, output: result.result };
				});
			},
		);
	}
}
