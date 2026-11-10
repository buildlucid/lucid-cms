/**
 * The performance lane's command. It loads every `*.bench.ts` in the lane's folder, takes each
 * benchmark's samples one after another, and writes the measurements as the lane's result.
 */
import { glob } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import loadContext from "../../environment/load-context.ts";
import { getBenchmarks } from "../../performance/benchmark.ts";
import summarizeSamples from "../../performance/summarize-samples.ts";
import type { BenchmarkContext, Metric } from "../../performance/types.ts";
import type { Measurement } from "../../report/types.ts";
import writeLaneResult from "../../report/write-lane-result.ts";
import { paths } from "../../utils/paths.ts";

const DEFAULT_WARMUPS = 1;

const context = loadContext();
const benchmarkContext: BenchmarkContext = {
	setup: context.setup,
	work: context.paths.work,
	//* benchmarks run no CMS, but the setup's config still needs these to load
	env: {
		HARNESS_DATABASE_URL: "unused-by-benchmarks",
		HARNESS_URL: "http://localhost:6543",
	},
};

const laneDirectory = path.join(paths.suites, context.lane);
for await (const file of glob("**/*.bench.ts", { cwd: laneDirectory })) {
	await import(pathToFileURL(path.join(laneDirectory, file)).href);
}

const measurements: Measurement[] = [];
const errors: string[] = [];

for (const benchmark of getBenchmarks()) {
	try {
		for (
			let warmup = 0;
			warmup < (benchmark.warmups ?? DEFAULT_WARMUPS);
			warmup++
		) {
			await benchmark.sample(benchmarkContext);
		}

		const samples: Array<Record<string, Metric>> = [];
		for (let run = 0; run < context.performanceRuns; run++) {
			samples.push(await benchmark.sample(benchmarkContext));
			console.log(
				`${benchmark.id}: sample ${run + 1}/${context.performanceRuns}`,
			);
		}
		measurements.push(...summarizeSamples(benchmark.id, samples));
	} catch (error) {
		errors.push(
			`Benchmark "${benchmark.id}" failed: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`,
		);
	}
}

await writeLaneResult({ tests: [], measurements, errors });
process.exit(errors.length > 0 ? 1 : 0);
