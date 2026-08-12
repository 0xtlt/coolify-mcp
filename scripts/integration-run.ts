#!/usr/bin/env node
/**
 * Run integration test files sequentially.
 * Usage: pnpm run test:integration:run
 */
import { fileURLToPath } from "node:url";
import { run } from "./spawn.ts";

const root = fileURLToPath(new URL("..", import.meta.url));

const files = [
	"01-system",
	"02-teams",
	"03-projects",
	"04-private-keys",
	"05-servers",
	"06-applications",
	"07-app-envs",
	"08-databases",
	"09-db-envs",
	"10-services",
	"11-service-envs",
	"12-deployments",
	"13-logs",
	"15-scheduled-tasks",
	"16-storages",
	"17-github-apps",
	"18-resources",
	"14-cleanup",
];

let failed = false;

for (const file of files) {
	const path = `src/__integration__/${file}.integration.test.ts`;
	console.log(`\n--- Running ${file} ---`);
	const result = await run(
		"pnpm",
		["exec", "vitest", "run", "--config", "vitest.integration.config.ts", path],
		{ cwd: root, inherit: true },
	);
	if (result.code !== 0) {
		console.error(`FAILED: ${file}`);
		failed = true;
		break;
	}
}

if (failed) {
	process.exit(1);
}

console.log("\nAll integration tests passed!");
