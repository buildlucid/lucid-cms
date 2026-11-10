import { defineConfig } from "vitest/config";
import loadContext from "../../environment/load-context.ts";
import { paths } from "../../utils/paths.ts";
import HarnessReporter from "./reporter.ts";

const context = loadContext();

/** The config every Vitest lane runs with. The context decides which suite folder it reads. */
export default defineConfig({
	test: {
		name: `${context.setup.name} ${context.lane} (${context.mode})`,
		root: paths.root,
		include: [`suites/${context.lane}/**/*.test.ts`],
		reporters: ["default", new HarnessReporter()],
		testTimeout: 30_000,
		hookTimeout: 60_000,
		passWithNoTests: true,
		server: {
			deps: {
				//* Lucid's packages are linked from this repository, so Vitest would transform its own copy
				//* of them. A setup's config loads them through Node, and both must be the same instance.
				external: [/\/packages\/[^/]+\/dist\//],
			},
		},
	},
});
