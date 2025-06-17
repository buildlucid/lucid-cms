import { defineProject } from "vitest/config";

export default defineProject({
	test: {
		environment: "node",
		hookTimeout: 0,
		testTimeout: 0,
	},
});
