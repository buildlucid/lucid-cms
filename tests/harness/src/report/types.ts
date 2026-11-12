import type { Mode } from "../setup/types.ts";

/**
 * - `skipped`: someone turned the test off.
 * - `notApplicable`: the setup lacks something the test requires, so it could never run there.
 */
export type TestStatus = "passed" | "failed" | "skipped" | "notApplicable";

/** One test's result in one lane run. Every test runner's results are turned into this shape. */
export type TestRecord = {
	/**
	 * The same for a test in every setup and mode, so results can be lined up side by side.
	 * Built from the file and the test's full name.
	 */
	id: string;
	/** The test file, relative to the lane's folder, such as `auth/login.test.ts`. */
	file: string;
	/** The describe blocks around the test, outermost first. */
	groups: string[];
	name: string;
	status: TestStatus;
	durationMs: number;
	/** Why it was skipped or does not apply, such as the capability the setup lacks. */
	skipReason?: string;
	/** True when it only passed after a retry. */
	flaky: boolean;
	errors: string[];
};

export type MeasurementUnit = "ms" | "bytes" | "count";

/** One number a performance lane measured for a setup, such as how long a build took. */
export type Measurement = {
	/** The same in every setup and run, such as `build.duration`, so a run can show the last one's value. */
	id: string;
	label: string;
	unit: MeasurementUnit;
	/** The median of the samples. Lower is better for every unit. */
	value: number;
	samples: number[];
	/** How much the samples varied, as a share of the median. Zero for exact measures such as sizes. */
	spread: number;
};

/** What a lane's reporter writes when it finishes. */
export type LaneResult = {
	tests: TestRecord[];
	measurements: Measurement[];
	/** Failures outside any test, such as a file that could not be loaded. */
	errors: string[];
};

/** One lane run against one setup in one mode. */
export type LaneReport = LaneResult & {
	setup: string;
	lane: string;
	mode: Mode;
	durationMs: number;
	/** Where its output was written, relative to the run's folder, when it was not shown live. */
	log?: string;
	/** True when only some of its files or tests ran, so its times and counts cover part of the lane. */
	filtered?: boolean;
};

export type RunSummary = Record<TestStatus, number> & {
	/** Tests that could run on their setup: every result except `notApplicable`. */
	applicable: number;
	/** Lane runs with failures outside any test. */
	errors: number;
	flaky: number;
};

/** A whole harness run: every lane run, plus totals. The shape of `report.json`. */
export type RunReport = {
	runId: string;
	startedAt: string;
	durationMs: number;
	seed: number;
	git: { commit: string | null; branch: string | null };
	node: string;
	ci: boolean;
	/** True when the run was cancelled, so lanes that had not finished are missing or failed. */
	stopped?: boolean;
	lanes: LaneReport[];
	/** Tests that applied to no setup in the run, which points at a mistyped or unmet `requires()`. */
	neverRan: string[];
	summary: RunSummary;
};

/** What later runs need from earlier ones, kept in `.harness/history.json`. */
export type History = {
	/** How long each lane run took last time, by job key, such as `node-sqlite/integration/host`. */
	lanes: Record<string, number>;
	/** Each measurement's last median, by setup and then measurement ID. */
	measurements: Record<string, Record<string, number>>;
};
