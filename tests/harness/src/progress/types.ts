import type { TestStatus } from "../report/types.ts";

/**
 * Lane progress events stored as JSON lines. Tests use lane-relative file paths and full names
 * joined by ` > `; benchmarks use their IDs as test names.
 */
export type ProgressEventBody =
	/** How many test files the runner found. */
	| { type: "files"; total: number }
	/** A file's tests are known. */
	| { type: "collected"; file: string; tests: number }
	| { type: "test-start"; file: string; name: string }
	/** How far a long test has got, such as a simulation's sequences or a benchmark's samples. */
	| {
			type: "test-progress";
			file: string;
			name: string;
			done: number;
			total: number;
	  }
	| {
			type: "test-end";
			file: string;
			name: string;
			status: TestStatus;
			durationMs: number;
			/** The first line of the first error, for a failed test. */
			error?: string;
	  }
	| { type: "file-end"; file: string };

export type ProgressEvent = ProgressEventBody & {
	/** When it happened, in milliseconds since the epoch. */
	at: number;
};
