import type { Lane } from "../lanes/types.ts";
import type { Mode, Setup } from "../setup/types.ts";
import type { ProfileKey } from "./profiles.ts";

/** Narrows which tests a lane runs. Empty lists keep everything. */
export type JobFilters = {
	/** Test files whose path holds one of these. */
	files: string[];
	/** Regular expressions matched against each test's describe blocks and name, joined by spaces. */
	tests: string[];
};

/** One lane run against one setup in one mode. */
export type Job = {
	setup: Setup;
	lane: Lane;
	mode: Mode;
	filters: JobFilters;
};

/** A setup and the jobs that run against it. The setup is prepared once for all of them. */
export type SetupPlan = {
	setup: Setup;
	jobs: Job[];
};

/** A lane run from an earlier report to run again, with the tests that failed in it. */
export type RetryJob = {
	setup: string;
	lane: string;
	mode: Mode;
	filters: JobFilters;
};

/** Narrows a run. An empty filter keeps everything. */
export type PlanFilters = JobFilters & {
	profile: ProfileKey;
	setups: string[];
	lanes: string[];
	modes: string[];
	/** Keeps only these lane runs, with their own filters, such as the failures from the last run. */
	retry?: RetryJob[];
};

export type RunOptions = PlanFilters & {
	/** How many lanes run at once across every setup. */
	concurrency: number;
	/** How many test workers each lane gets, so lanes side by side share the machine. */
	workers: number;
	/** How long a lane may run before it is stopped and reported as failed. */
	jobTimeoutMs: number;
	seed: number;
	simulationRuns: number;
	performanceRuns: number;
	/** Whether to start the Docker services that setups need. */
	services: boolean;
	/** Prints plain lines instead of drawing the live status block. */
	plain: boolean;
	/** Extra arguments for the lane's test runner. */
	passthrough: string[];
};
