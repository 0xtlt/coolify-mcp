import { readFileSync, writeFileSync } from "node:fs";
import { CoolifyClient } from "../client";

const STATE_FILE = "/tmp/coolify-integration-state.json";

export interface IntegrationState {
	token: string;
	projectUuid?: string;
	environmentName?: string;
	serverUuid?: string;
	applicationUuid?: string;
	databaseUuid?: string;
	serviceUuid?: string;
	privateKeyUuid?: string;
	appEnvUuid?: string;
	dbEnvUuid?: string;
	serviceEnvUuid?: string;
}

export function readState(): IntegrationState {
	try {
		return JSON.parse(readFileSync(STATE_FILE, "utf-8"));
	} catch {
		return { token: "" };
	}
}

export function writeState(state: IntegrationState): void {
	writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

export function updateState(partial: Partial<IntegrationState>): IntegrationState {
	const state = { ...readState(), ...partial };
	writeState(state);
	return state;
}

export function resetState(token: string): void {
	writeState({ token });
}

export function createTestClient(): CoolifyClient {
	const { token } = readState();
	return new CoolifyClient({
		coolifyApiUrl: process.env.COOLIFY_TEST_URL ?? "http://localhost:8099/api/v1",
		coolifyToken: token,
		timeout: 30000,
		debug: false,
		readonly: false,
		requireConfirm: false,
	});
}
