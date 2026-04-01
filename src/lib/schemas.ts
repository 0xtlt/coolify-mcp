import { z } from "zod";

export const uuid = z
	.string()
	.regex(/^[a-zA-Z0-9_-]+$/, "Invalid UUID format")
	.min(1)
	.max(100)
	.describe("UUID of the resource");

export const confirm = z
	.boolean()
	.optional()
	.describe("Set to true to confirm this destructive operation");

export const page = z.number().int().min(1).optional().describe("Page number for pagination");

export const perPage = z
	.number()
	.int()
	.min(1)
	.max(100)
	.optional()
	.describe("Items per page (max 100)");

// Shared creation schemas
export const serverUuid = z.string().min(1).max(100).describe("UUID of the server to deploy on");
export const projectUuid = z.string().min(1).max(100).describe("UUID of the project");
export const environmentName = z.string().min(1).describe("Environment name (e.g. 'production')");
export const instantDeploy = z.boolean().optional().describe("Deploy immediately after creation");
export const customFields = z
	.record(z.string(), z.unknown())
	.optional()
	.describe("Additional fields not listed above (advanced)");

export const numericId = z.number().int().min(1).describe("ID of the resource");
