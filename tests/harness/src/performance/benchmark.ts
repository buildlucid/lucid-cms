import type { Benchmark } from "./types.ts";

const benchmarks: Benchmark[] = [];

/**
 * Registers a benchmark. Call it at the top of a `*.bench.ts` file in `suites/performance`.
 *
 * @example
 * ```ts
 * benchmark({
 * 	id: "build",
 * 	sample: async ({ setup, env }) => {
 * 		const run = await runMeasured({ command: "lucidcms", args: ["build"], cwd: setup.directory, env });
 * 		return { duration: { label: "Build time", unit: "ms", value: run.durationMs } };
 * 	},
 * });
 * ```
 */
const benchmark = (definition: Benchmark): void => {
	benchmarks.push(definition);
};

/** The benchmarks registered so far, for the lane's runner. */
export const getBenchmarks = (): readonly Benchmark[] => benchmarks;

export default benchmark;
