import type { ProvisionedDatabase } from "../databases/types.ts";
import type { HarnessContext } from "../environment/types.ts";
import type serveBuilt from "../migrations/serve-built.ts";
import type { MeasurementUnit } from "../report/types.ts";

/** One number from one sample, such as how long this build took. */
export type Metric = {
	label: string;
	unit: MeasurementUnit;
	/** Lower is better, for every unit. */
	value: number;
	/**
	 * The share it may grow between runs before that counts as a regression.
	 * Defaults to 0.15 for timings, which vary between machines, and 0.01 for everything else.
	 */
	tolerance?: number;
	/**
	 * Whether a regression should fail a comparison, rather than only be reported.
	 * Defaults to false for timings and true for everything else.
	 */
	blocking?: boolean;
};

export type BenchmarkContext = {
	setup: HarnessContext["setup"];
	/** The environment the setup's config needs to load. Nothing is listening behind it. */
	env: Record<string, string>;
	/** A folder in the run's output for logs and scratch files. */
	work: string;
	/**
	 * Creates an empty database for the setup, such as to time its migrations. Pass its `url` as
	 * `HARNESS_DATABASE_URL`, and destroy it when the sample is done.
	 */
	database(): Promise<ProvisionedDatabase>;
	/**
	 * Builds the setup once, then starts its real server on a database that is already migrated,
	 * to time requests as a deployment would answer them. Stop it when the benchmark is done.
	 */
	serve(database: ProvisionedDatabase): Promise<ServedCms>;
};

/** A running server a benchmark sends requests to. */
export type ServedCms = Awaited<ReturnType<typeof serveBuilt>>;

/**
 * Something to measure for every setup, such as a build. A benchmark that needs something made
 * once for all its samples, such as a server full of content, makes it in `prepare`.
 */
export type Benchmark<Prepared = undefined> = {
	/** Starts every measurement's ID, such as `build` in `build.duration`. Keep it stable, as runs are compared by it. */
	id: string;
	/** Samples to take first and throw away, so caches are warm. Defaults to 1. */
	warmups?: number;
} & (
	| {
			prepare?: undefined;
			cleanup?: undefined;
			/**
			 * Does the work once and returns what it measured, keyed by a short name such as `duration`.
			 * It runs once per sample, and the report keeps each metric's median.
			 */
			sample: (context: BenchmarkContext) => Promise<Record<string, Metric>>;
	  }
	| {
			/** Runs once before the first sample. What it returns is given to every sample. */
			prepare: (context: BenchmarkContext) => Promise<Prepared>;
			/** Runs once after the last sample, and when a sample fails. */
			cleanup?: (prepared: Prepared) => Promise<void>;
			sample: (
				context: BenchmarkContext,
				prepared: Prepared,
			) => Promise<Record<string, Metric>>;
	  }
);

/** A benchmark as the lane's runner sees it, with what it prepared kept inside. */
export type RegisteredBenchmark = Pick<Benchmark, "id" | "warmups"> & {
	open(context: BenchmarkContext): Promise<{
		sample(): Promise<Record<string, Metric>>;
		close(): Promise<void>;
	}>;
};
