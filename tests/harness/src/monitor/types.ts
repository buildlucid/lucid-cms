import type { ProfileKey } from "../cli/profiles.ts";
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

/** A test that has finished, with how long it took last time when an earlier run had it. */
export type FinishedTest = {
	job: string;
	file: string;
	name: string;
	status: TestStatus;
	durationMs: number;
	previousMs?: number;
	error?: string;
};

/** One lane run as the dashboard sees it. */
export type JobState = {
	key: string;
	setup: string;
	lane: string;
	mode: Mode;
	/** What its tests are called. Measuring lanes run benchmarks. */
	unit: "tests" | "benchmarks";
	status: JobStatus;
	/** What it is waiting on while preparing, such as building the server. */
	phase?: string;
	/** When its test runner started. */
	startedAt?: number;
	finishedAt?: number;
	/** When it last reported anything, to tell a quiet job from a busy one. */
	activeAt?: number;
	/** How long its test runner took in the latest earlier run that had it. */
	previousMs?: number;
	/** `collected` counts files whose tests are known, so the test total is final once it reaches `total`. */
	files: { total?: number; collected: number; done: number };
	tests: { total: number; done: number; failed: number };
	running: RunningTest[];
	/** Its log file, relative to the run's folder. */
	log?: string;
	/** What its results came to once it finished. */
	result?: {
		summary: RunSummary;
		measurements: number;
		/** The first line of each failure outside any test. */
		errors: string[];
	};
};

/** Everything a view needs to draw a run. Plain data, so it is also what `status.json` holds. */
export type RunState = {
	runId: string;
	profile: ProfileKey;
	seed: number;
	/** The process running it, so `status` can tell a crashed run from a running one. */
	pid: number;
	startedAt: number;
	finishedAt?: number;
	/** What the run is doing before any lane starts, such as starting Docker services. */
	phase?: string;
	/** True once the run was cancelled and is cleaning up. */
	stopping: boolean;
	/** How long the latest earlier run of exactly these lanes took, for a time estimate. */
	previousMs?: number;
	jobs: JobState[];
	/** Every failed test so far, oldest first. */
	failures: FinishedTest[];
	/** The slowest tests so far, slowest first. */
	slowest: FinishedTest[];
	warnings: string[];
};

/** Something worth a line of its own in plain output. The dashboard shows these through the state. */
export type RunNote =
	| { type: "phase"; scope: string; message: string }
	| { type: "job-start"; job: JobState }
	| { type: "job-end"; job: JobState }
	| { type: "test-failed"; job: JobState; test: FinishedTest }
	| { type: "warning"; message: string };

/** Draws a run as it happens. */
export type RunView = {
	/** Called on every change and on a timer, with the whole state. */
	render(state: RunState): void;
	notify(note: RunNote): void;
	/** Draws the final state and stops drawing, before the end-of-run report prints. */
	stop(state: RunState): void;
};
