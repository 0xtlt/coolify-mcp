import { type SpawnOptionsWithoutStdio, spawn } from "node:child_process";

export function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export function run(
	command: string,
	args: string[],
	options: SpawnOptionsWithoutStdio & { inherit?: boolean } = {},
): Promise<{ code: number; stdout: string; stderr: string }> {
	const { inherit, ...spawnOptions } = options;
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			...spawnOptions,
			stdio: inherit ? "inherit" : ["ignore", "pipe", "pipe"],
		});

		if (inherit) {
			child.on("error", reject);
			child.on("close", (code) => {
				resolve({ code: code ?? 1, stdout: "", stderr: "" });
			});
			return;
		}

		let stdout = "";
		let stderr = "";
		child.stdout?.on("data", (chunk: Buffer | string) => {
			stdout += chunk.toString();
		});
		child.stderr?.on("data", (chunk: Buffer | string) => {
			stderr += chunk.toString();
		});
		child.on("error", reject);
		child.on("close", (code) => {
			resolve({ code: code ?? 1, stdout, stderr });
		});
	});
}
