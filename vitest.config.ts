import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		projects: [
			{
				test: {
					name: "packages",
					include: ["packages/**/*.test.{ts,tsx}"],
					exclude: ["**/node_modules/**", "packages/admin/**"],
				},
			},
			"./packages/admin/vite.config.ts",
		],
	},
});
