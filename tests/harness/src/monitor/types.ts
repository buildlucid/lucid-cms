import type { RunSummary, TestStatus } from "../report/types.ts";
import type { Mode } from "../setup/types.ts";

/**
 * - `waiting`: nothing has started for it yet.
 * - `preparing`: its database or server is being made, or it waits for a free slot.
 * - `running`: its test runner is running.
 */
export type JobStatus =
	| "waiting"
	| "preparing"
	| "running"
	| "passed"
	| "failed";

/** A test that is running now, with how far it has got when it says. */
export type RunningTest = {
	file: string;
	/** Describe blocks and name joined by ` > `. */
	name: string;
	startedAt: number;
	progress?: { done: number; total: number };
};

/** A test that has finished. */
export type FinishedTest = {
	file: string;
	/** Describe blocks and name joined by ` > `. */
	name: string;
	status: TestStatus;
	/** The first error with its causes, for a failed test. */
	error?: string;
};

/** One lane run as the live output sees it. */
export type JobState = {
	key: string;
	setup: string;
	lane: string;
	mode: Mode;
	/** It measures, so it runs alone at the end of the run. */
	exclusive: boolean;
	status: JobStatus;
	/** What it is waiting on while preparing, such as building the server. */
	phase?: string;
	/** When its test runner started. */
	startedAt?: number;
	finishedAt?: number;
	/** When it last reported anything, to tell a quiet job from a busy one. */
	activeAt?: number;
	/** How long its test runner took last time, from `.harness/history.json`. */
	previousMs?: number;
	/** `collected` counts files whose tests are known, so the test total is final once it reaches `total`. */
	files: { total?: number; collected: number };
	tests: { total: number; done: number; failed: number };
	running: RunningTest[];
	/** What its results came to once it finished. */
	result?: {
		summary: RunSummary;
		measurements: number;
		/** The first line of each failure outside any test. */
		errors: string[];
	};
};

/** Everything the live output needs to draw a run. Plain data, so it is also what `status.json` holds. */
export type RunState = {
	runId: string;
	/** The process running it, so `status` can tell a crashed run from a running one. */
	pid: number;
	startedAt: number;
	finishedAt?: number;
	/** True once the run was cancelled and is cleaning up. */
	stopping: boolean;
	/** How many lanes run at once, for the time estimate. */
	concurrency: number;
	/** How wide lane lines' setup and lane columns are: as wide as the plan's longest. */
	columns: { setup: number; lane: number };
	jobs: JobState[];
};

/** Something that gets a permanent line of its own. See `formatNote`. */
export type RunNote =
	| { type: "phase"; message: string }
	| { type: "warning"; message: string }
	| { type: "stopping" }
	| { type: "job-end"; job: JobState }
	| { type: "test-failed"; job: JobState; test: FinishedTest };

/** Shows a run as it happens. It reads the run's state itself, which the monitor keeps up to date. */
export type RunView = {
	notify(note: RunNote): void;
	/** Stops drawing, before the end-of-run report prints. */
	stop(): void;
};
