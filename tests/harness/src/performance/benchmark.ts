import type { Benchmark, RegisteredBenchmark } from "./types.ts";

const benchmarks: RegisteredBenchmark[] = [];

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
const benchmark = <Prepared = undefined>(
	definition: Benchmark<Prepared>,
): void => {
	benchmarks.push({
		id: definition.id,
		warmups: definition.warmups,
		open: async (context) => {
			if (!definition.prepare) {
				return {
					sample: () => definition.sample(context),
					close: async () => {},
				};
			}

			const prepared = await definition.prepare(context);
			return {
				sample: () => definition.sample(context, prepared),
				close: async () => {
					await definition.cleanup?.(prepared);
				},
			};
		},
	});
};

/** The benchmarks registered so far, for the lane's runner. */
export const getBenchmarks = (): readonly RegisteredBenchmark[] => benchmarks;

export default benchmark;
