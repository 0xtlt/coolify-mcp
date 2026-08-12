import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		include: ["src/**/*.test.ts"],
		exclude: ["src/__integration__/**", "node_modules", "dist"],
		environment: "node",
		testTimeout: 10_000,
	},
});
