import { z } from "zod";

const configSchema = z.object({
	coolifyApiUrl: z.string().url(),
	coolifyToken: z.string().min(1),
	timeout: z.number().default(30000),
	debug: z.boolean().default(false),
	readonly: z.boolean().default(false),
	requireConfirm: z.boolean().default(false),
});

export type Config = z.infer<typeof configSchema>;

export function validateConfig(raw: Record<string, unknown>): Config {
	return configSchema.parse(raw);
}

export function loadConfig(): Config {
	const raw = {
		coolifyApiUrl: process.env.COOLIFY_API_URL,
		coolifyToken: process.env.COOLIFY_TOKEN,
		timeout: process.env.COOLIFY_TIMEOUT
			? Number.parseInt(process.env.COOLIFY_TIMEOUT, 10)
			: undefined,
		debug: process.env.DEBUG === "true",
		readonly: process.env.COOLIFY_READONLY === "true",
		requireConfirm: process.env.COOLIFY_REQUIRE_CONFIRM === "true",
	};

	try {
		return validateConfig(raw);
	} catch (error) {
		if (error instanceof z.ZodError) {
			console.error("Configuration error:", error.flatten());
		} else {
			console.error("Configuration error:", error);
		}
		process.exit(1);
	}
}
