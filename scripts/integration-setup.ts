#!/usr/bin/env bun
/**
 * Start Docker containers, wait for Coolify API, bootstrap token.
 * Usage: bun scripts/integration-setup.ts
 */
import { writeFileSync } from "node:fs";

const COOLIFY_URL = process.env.COOLIFY_TEST_URL ?? "http://localhost:8099";
const MAX_WAIT_MS = 120_000;
const POLL_INTERVAL_MS = 3_000;
const STATE_FILE = "/tmp/coolify-integration-state.json";

async function main() {
	console.log("Starting Docker containers...");
	const compose = Bun.spawn(
		["docker", "compose", "-f", "docker-compose.test.yml", "up", "-d"],
		{ stdout: "inherit", stderr: "inherit" },
	);
	if ((await compose.exited) !== 0) {
		console.error("docker compose up failed");
		process.exit(1);
	}

	console.log(`Waiting for Coolify API at ${COOLIFY_URL}...`);
	const deadline = Date.now() + MAX_WAIT_MS;
	while (Date.now() < deadline) {
		try {
			const res = await fetch(`${COOLIFY_URL}/api/v1/version`);
			if (res.status === 401 || res.status === 200) {
				console.log("Coolify API is responding!");
				break;
			}
		} catch {
			// not ready
		}
		await Bun.sleep(POLL_INTERVAL_MS);
	}

	if (Date.now() >= deadline) {
		console.error(`Timed out waiting for Coolify after ${MAX_WAIT_MS / 1000}s`);
		process.exit(1);
	}

	// Bootstrap: enable API + create token via artisan tinker
	console.log("Enabling API via artisan tinker...");
	const enableApi = Bun.spawn(
		[
			"docker",
			"exec",
			"coolify-mcp-coolify-1",
			"php",
			"artisan",
			"tinker",
			"--execute",
			`$s = \\App\\Models\\InstanceSettings::find(0); $s->is_api_enabled = true; $s->save(); echo 'API_ENABLED';`,
		],
		{ stdout: "pipe", stderr: "pipe" },
	);
	const enableOut = await new Response(enableApi.stdout).text();
	if (!enableOut.includes("API_ENABLED")) {
		console.error("Failed to enable API:", enableOut);
		const errOut = await new Response(enableApi.stderr).text();
		console.error(errOut);
		process.exit(1);
	}
	console.log("API enabled.");

	console.log("Creating API token...");
	const createToken = Bun.spawn(
		[
			"docker",
			"exec",
			"coolify-mcp-coolify-1",
			"php",
			"artisan",
			"tinker",
			"--execute",
			[
				"use Illuminate\\Support\\Str;",
				"use Illuminate\\Support\\Facades\\DB;",
				"$plain = Str::random(40);",
				"$hashed = hash('sha256', $plain);",
				"DB::table('personal_access_tokens')->insert([",
				"  'tokenable_type' => 'App\\\\Models\\\\User',",
				"  'tokenable_id' => 0,",
				"  'team_id' => 0,",
				"  'name' => 'integration-test',",
				"  'token' => $hashed,",
				"  'abilities' => '[\"*\"]',",
				"  'created_at' => now(),",
				"  'updated_at' => now(),",
				"]);",
				"$id = DB::table('personal_access_tokens')->where('name', 'integration-test')->value('id');",
				"echo 'TOKEN:' . $id . '|' . $plain;",
			].join(" "),
		],
		{ stdout: "pipe", stderr: "pipe" },
	);
	const tokenOut = await new Response(createToken.stdout).text();
	const tokenMatch = tokenOut.match(/TOKEN:(\S+)/);
	if (!tokenMatch) {
		console.error("Failed to create token:", tokenOut);
		const errOut = await new Response(createToken.stderr).text();
		console.error(errOut);
		process.exit(1);
	}
	const token = tokenMatch[1];
	console.log("Token created.");

	// Verify token works
	const verifyRes = await fetch(`${COOLIFY_URL}/api/v1/version`, {
		headers: { Authorization: `Bearer ${token}` },
	});
	if (!verifyRes.ok) {
		console.error("Token verification failed:", verifyRes.status, await verifyRes.text());
		process.exit(1);
	}
	const version = await verifyRes.text();
	console.log(`Coolify ${version} ready. Token verified.`);

	// Write state
	writeFileSync(STATE_FILE, JSON.stringify({ token }, null, 2));
	console.log("Integration environment ready.");
}

main();
