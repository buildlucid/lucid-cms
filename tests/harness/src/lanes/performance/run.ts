/**
 * Runs each `*.bench.ts` in turn and writes their measurements as the lane result.
 *
 * Usage: node run.ts [--file <text>]... [--test <pattern>]... [file text]...
 */
import { glob } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import createDatabaseName from "../../databases/create-database-name.ts";
import createEmptyDatabase from "../../databases/create-empty-database.ts";
import { resolveDriver } from "../../databases/get-driver.ts";
import loadContext from "../../environment/load-context.ts";
import serveBuilt from "../../migrations/serve-built.ts";
import { getBenchmarks } from "../../performance/benchmark.ts";
import summarizeSamples from "../../performance/summarize-samples.ts";
import type {
	BenchmarkContext,
	Metric,
	RegisteredBenchmark,
} from "../../performance/types.ts";
import emitProgress from "../../progress/emit-progress.ts";
import type { Measurement } from "../../report/types.ts";
import writeLaneResult from "../../report/write-lane-result.ts";
import getLauncher from "../../servers/get-launcher.ts";
import { paths } from "../../utils/paths.ts";

const DEFAULT_WARMUPS = 1;

const context = loadContext();
//* most benchmarks run no CMS, but the setup's config still needs these to load
const env = {
	HARNESS_DATABASE_URL: "unused-by-benchmarks",
	HARNESS_URL: "http://localhost:6543",
};

let built: Promise<void> | undefined;
/** Builds the setup the first time a benchmark serves it, so the server runs the current code. */
const build = () => {
	built ??= getLauncher(context.setup.runtime).build({
		setup: context.setup,
		env,
		log: path.join(context.paths.work, "serve-build.log"),
	});
	return built;
};

const benchmarkContext: BenchmarkContext = {
	setup: context.setup,
	work: context.paths.work,
	env,
	serve: async (database) => {
		await build();
		return serveBuilt({ context, databaseUrl: database.url, step: null });
	},
	database: () =>
		createEmptyDatabase(resolveDriver(context.setup.database), {
			directory: context.paths.work,
			name: createDatabaseName(context.runId, "benchmark"),
		}),
};

//* `--file` and bare arguments keep files whose path holds one of them, `--test` keeps benchmarks whose ID matches
const { values, positionals } = parseArgs({
	allowPositionals: true,
	options: {
		file: { type: "string", multiple: true },
		test: { type: "string", multiple: true },
	},
});
const files = [...(values.file ?? []), ...positionals];
const tests = (values.test ?? []).map((pattern) => new RegExp(pattern));

const laneDirectory = path.join(paths.suites, context.lane);
const selected: Array<{ file: string; benchmark: RegisteredBenchmark }> = [];
for await (const file of glob("**/*.bench.ts", { cwd: laneDirectory })) {
	if (files.length > 0 && !files.some((filter) => file.includes(filter))) {
		continue;
	}

	const registered = getBenchmarks().length;
	await import(pathToFileURL(path.join(laneDirectory, file)).href);
	for (const benchmark of getBenchmarks().slice(registered)) {
		if (tests.length === 0 || tests.some((test) => test.test(benchmark.id))) {
			selected.push({ file, benchmark });
		}
	}
}

const byFile = Map.groupBy(selected, (entry) => entry.file);
emitProgress({ type: "files", total: byFile.size });
for (const [file, entries] of byFile) {
	emitProgress({ type: "collected", file, tests: entries.length });
}

const measurements: Measurement[] = [];
const errors: string[] = [];

for (const { file, benchmark } of selected) {
	const test = { file, name: benchmark.id };
	const warmups = benchmark.warmups ?? DEFAULT_WARMUPS;
	const total = warmups + context.performanceRuns;
	const startedAt = Date.now();
	emitProgress({ type: "test-start", ...test });

	try {
		const opened = await benchmark.open(benchmarkContext);
		try {
			for (let warmup = 0; warmup < warmups; warmup++) {
				await opened.sample();
				emitProgress({
					type: "test-progress",
					...test,
					done: warmup + 1,
					total,
				});
			}

			const samples: Array<Record<string, Metric>> = [];
			for (let run = 0; run < context.performanceRuns; run++) {
				samples.push(await opened.sample());
				emitProgress({
					type: "test-progress",
					...test,
					done: warmups + run + 1,
					total,
				});
				console.log(
					`${benchmark.id}: sample ${run + 1}/${context.performanceRuns}`,
				);
			}
			measurements.push(...summarizeSamples(benchmark.id, samples));
		} finally {
			await opened.close();
		}
		emitProgress({
			type: "test-end",
			...test,
			status: "passed",
			durationMs: Date.now() - startedAt,
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		errors.push(
			`Benchmark "${benchmark.id}" failed: ${error instanceof Error ? (error.stack ?? message) : message}`,
		);
		emitProgress({
			type: "test-end",
			...test,
			status: "failed",
			durationMs: Date.now() - startedAt,
			error: message.split("\n")[0],
		});
	}

	const last = byFile.get(file)?.at(-1);
	if (last?.benchmark === benchmark) {
		emitProgress({ type: "file-end", file });
	}
}

await writeLaneResult({ tests: [], measurements, errors });
process.exit(errors.length > 0 ? 1 : 0);
