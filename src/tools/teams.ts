import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CoolifyClient } from "../client";
import type { Config } from "../config";
import { wrap } from "../lib/wrap";
import { toTeamSummary } from "../types/api";

export function registerTeamTools(server: McpServer, client: CoolifyClient, _config: Config) {
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

	server.tool("coolify_get_current_team", "Get the current authenticated team", {}, async () => {
		return wrap(() => client.getCurrentTeam());
	});

	server.tool(
		"coolify_get_team_members",
		"List members of a specific team",
		{ team_id: z.number().int().min(0).describe("ID of the team") },
		async ({ team_id }) => {
			return wrap(() => client.getTeamMembers(team_id));
		},
	);
}
