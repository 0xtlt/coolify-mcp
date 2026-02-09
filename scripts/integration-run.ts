#!/usr/bin/env bun
/**
 * Run integration test files sequentially (bun test runs in parallel by default).
 * Usage: bun scripts/integration-run.ts
 */

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
	"14-cleanup",
];

let failed = false;

for (const file of files) {
	const path = `src/__integration__/${file}.integration.test.ts`;
	console.log(`\n--- Running ${file} ---`);
	const proc = Bun.spawn(["bun", "test", "--timeout", "30000", path], {
		stdout: "inherit",
		stderr: "inherit",
		cwd: import.meta.dir.replace("/scripts", ""),
	});
	const exitCode = await proc.exited;
	if (exitCode !== 0) {
		console.error(`FAILED: ${file}`);
		failed = true;
		break;
	}
}

if (failed) {
	process.exit(1);
}

console.log("\nAll integration tests passed!");
