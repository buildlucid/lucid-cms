import type { MeasurementUnit, TestStatus } from "../report/types.ts";

/** A test whose result changed between two runs, in one setup and mode. */
export type TestChange = {
	id: string;
	setup: string;
	mode: string;
	base: TestStatus | null;
	head: TestStatus;
	/** The failure, or the reason it does not apply, in the newer run. */
	detail?: string;
};

export type SlowerTest = {
	id: string;
	setup: string;
	mode: string;
	baseMs: number;
	headMs: number;
};

export type MeasurementVerdict =
	| "regression"
	| "improvement"
	| "unchanged"
	| "new";

/** One measurement in the newer run, against the same one in the older run. */
export type MeasurementChange = {
	id: string;
	setup: string;
	label: string;
	unit: MeasurementUnit;
	base: number | null;
	head: number;
	/** The change as a share of the base, such as 0.2 for 20% more. Null when there is no base. */
	change: number | null;
	/** The share it had to change by to count, from its tolerance and how much its samples varied. */
	threshold: number;
	verdict: MeasurementVerdict;
	/** Whether a regression in it should fail the comparison. */
	blocking: boolean;
};

type RunIdentity = {
	runId: string;
	commit: string | null;
	branch: string | null;
	startedAt: string;
};

/**
 * Changes from base to head, comparing only shared lane runs so shorter runs can be compared with
 * full runs.
 */
export type Comparison = {
	base: RunIdentity;
	head: RunIdentity;
	tests: {
		/** Failing now, and not failing before. */
		newlyFailing: TestChange[];
		/** Passing now, and failing before. */
		fixed: TestChange[];
		/** Ran before, and no longer applies to the setup. */
		newlyNotApplicable: TestChange[];
		/** Test IDs that only the newer run has. */
		added: string[];
		/** Test IDs that only the older run has. */
		removed: string[];
		slower: SlowerTest[];
	};
	measurements: MeasurementChange[];
	/** Lane runs in the newer run with nothing to compare against, such as `node-sqlite e2e (served)`. */
	notCompared: string[];
	/** Regressions in blocking measurements. A comparison fails when there are any. */
	blockingRegressions: number;
};
