import path from "node:path";
import fc from "fast-check";
import { expect } from "vitest";
import loadContext from "../environment/load-context.ts";
import emitProgress from "../progress/emit-progress.ts";
import { paths } from "../utils/paths.ts";

/**
 * Returns `fc.assert` seed, run count and progress reporting. Caps reported progress during
 * failure shrinking.
 */
const getRunOptions = (): Parameters<typeof fc.assert>[1] & {
	seed: number;
	numRuns: number;
} => {
	const context = loadContext();
	const { currentTestName, testPath } = expect.getState();
	const test = {
		file: path.relative(path.join(paths.suites, context.lane), testPath ?? ""),
		name: currentTestName ?? "",
	};
	let done = 0;

	return {
		seed: context.seed,
		numRuns: context.simulationRuns,
		plugins: [
			fc.afterEach(() => {
				done++;
				emitProgress({
					type: "test-progress",
					...test,
					done: Math.min(done, context.simulationRuns),
					total: context.simulationRuns,
				});
			}),
		],
	};
};

export default getRunOptions;
