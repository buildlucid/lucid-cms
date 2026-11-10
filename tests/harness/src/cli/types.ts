import type { Lane } from "../lanes/types.ts";
import type { Mode, Setup } from "../setup/types.ts";
import type { Profile } from "./profiles.ts";

/** One lane run against one setup in one mode. */
export type Job = {
	setup: Setup;
	lane: Lane;
	mode: Mode;
};

/** A setup and the jobs that run against it. The setup is prepared once for all of them. */
export type SetupPlan = {
	setup: Setup;
	jobs: Job[];
};

/** Narrows a run. An empty filter keeps everything. */
export type PlanFilters = {
	profile: Profile;
	setups: string[];
	lanes: string[];
	modes: string[];
};

export type RunOptions = PlanFilters & {
	/** How many setups run at once. */
	concurrency: number;
	seed: number;
	simulationRuns: number;
	performanceRuns: number;
	/** Whether to start the Docker services that setups need. */
	services: boolean;
	/** Extra arguments for the lane's test runner. */
	passthrough: string[];
};
