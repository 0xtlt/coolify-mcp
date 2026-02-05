import { z } from "zod";

const configSchema = z.object({
	coolifyApiUrl: z.string().url(),
	coolifyToken: z.string().min(1),
	timeout: z.number().default(30000),
	debug: z.boolean().default(false),
});

export type Config = z.infer<typeof configSchema>;

export function loadConfig(): Config {
	const raw = {
		coolifyApiUrl: process.env.COOLIFY_API_URL,
		coolifyToken: process.env.COOLIFY_TOKEN,
		timeout: process.env.COOLIFY_TIMEOUT
			? Number.parseInt(process.env.COOLIFY_TIMEOUT, 10)
			: undefined,
		debug: process.env.DEBUG === "true",
	};

	const result = configSchema.safeParse(raw);
	if (!result.success) {
		console.error("Configuration error:", result.error.flatten());
		process.exit(1);
	}
	return result.data;
}
