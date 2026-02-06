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
