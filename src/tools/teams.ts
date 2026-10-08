import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CoolifyClient } from "../client";
import type { Config } from "../config";
import { isToolAllowed, readonlyError } from "../lib/safety";
import { wrap } from "../lib/wrap";
import { toTeamSummary } from "../types/api";

export function registerTeamTools(server: McpServer, client: CoolifyClient, config: Config) {
	server.tool(
		"coolify_list_teams",
		"List all teams (returns summary: id, name, description)",
		{},
		async () => {
			return wrap(async () => {
				const teams = await client.listTeams();
				return teams.map(toTeamSummary);
			});
		},
	);

	server.tool(
		"coolify_get_current_team",
		"Get the team bound to the API token (GET /team)",
		{},
		async () => {
			return wrap(() => client.getCurrentTeam());
		},
	);

	if (isToolAllowed("coolify_update_current_team", config)) {
		server.tool(
			"coolify_update_current_team",
			"[WRITE] Update the team bound to the API token (Coolify v4.4+). Sets whether builds fall back to the deployment server when no build server is usable.",
			{
				is_build_server_fallback_enabled: z
					.boolean()
					.describe("Build on the deployment server when no build server is usable"),
			},
			async (fields) => {
				if (!isToolAllowed("coolify_update_current_team", config))
					return readonlyError("coolify_update_current_team");
				return wrap(() => client.updateCurrentTeam(fields));
			},
		);
	}

	server.tool(
		"coolify_get_current_team_members",
		"List members of the team bound to the API token (GET /team/members)",
		{},
		async () => {
			return wrap(() => client.getCurrentTeamMembers());
		},
	);

	server.tool(
		"coolify_get_team_members",
		"List members of a specific team by ID (GET /teams/{id}/members)",
		{ team_id: z.number().int().min(0).describe("ID of the team") },
		async ({ team_id }) => {
			return wrap(() => client.getTeamMembers(team_id));
		},
	);
}
