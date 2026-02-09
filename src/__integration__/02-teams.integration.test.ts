import { describe, expect, test } from "bun:test";
import { createTestClient } from "./setup";

const client = createTestClient();

describe("02 - Teams", () => {
	test("listTeams returns an array", async () => {
		const teams = await client.listTeams();
		expect(Array.isArray(teams)).toBe(true);
		expect(teams.length).toBeGreaterThan(0);
		expect(teams[0]).toHaveProperty("id");
		expect(teams[0]).toHaveProperty("name");
	});

	test("getCurrentTeam returns the root team", async () => {
		const team = await client.getCurrentTeam();
		expect(team).toHaveProperty("id");
		expect(team).toHaveProperty("name");
	});

	test("getTeamMembers returns members for team 0", async () => {
		const teams = await client.listTeams();
		const members = await client.getTeamMembers(teams[0].id);
		expect(Array.isArray(members)).toBe(true);
	});
});
