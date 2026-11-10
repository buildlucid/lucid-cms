import type { HarnessContext } from "../environment/types.ts";
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
};

/** Something to measure for every setup, such as a build. */
export type Benchmark = {
	/** Starts every measurement's ID, such as `build` in `build.duration`. Keep it stable, as runs are compared by it. */
	id: string;
	/** Samples to take first and throw away, so caches are warm. Defaults to 1. */
	warmups?: number;
	/**
	 * Does the work once and returns what it measured, keyed by a short name such as `duration`.
	 * It runs once per sample, and the report keeps each metric's median.
	 */
	sample: (context: BenchmarkContext) => Promise<Record<string, Metric>>;
};
