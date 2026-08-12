#!/usr/bin/env node
/**
 * Stop Docker containers and remove volumes.
 * Usage: pnpm run test:integration:teardown
 */
import { run } from "./spawn.ts";

async function main() {
	console.log("Stopping Docker containers...");
	const compose = await run(
		"docker",
		["compose", "-f", "docker-compose.test.yml", "down", "-v", "--remove-orphans"],
		{ inherit: true },
	);
	if (compose.code !== 0) {
		console.error("docker compose down failed");
		process.exit(1);
	}
	console.log("Containers stopped and volumes removed.");
}

main();
