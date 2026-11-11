import type { Job, PlanFilters } from "./types.ts";

type Profile = {
	description: string;
	/** Whether a job is part of the run. `filters` holds what was asked for on the command line. */
	keeps(job: Job, filters: PlanFilters): boolean;
	/** Whether an unfiltered run covers every test, so a test that applied to no setup is worth flagging. */
	complete: boolean;
};

/**
 * Named choices of what a run covers, for `--profile`.
 * - `local` is the default. It leaves out lanes that measure, which take most of a full run,
 *   unless they are named with `--lane`.
 * - `full` runs everything. CI uses it on master.
 * - `pr` leaves out the slowest repeat: integration tests against the built server, which
 *   already run in host mode. Browser tests and benchmarks still run.
 */
const profiles = {
	local: {
		description: "every test lane; benchmarks only when named with --lane",
		keeps: (job, filters) =>
			job.lane.exclusive !== true || filters.lanes.includes(job.lane.key),
		complete: true,
	},
	full: {
		description: "everything, including benchmarks",
		keeps: () => true,
		complete: true,
	},
	pr: {
		description: "everything except integration tests against the built server",
		keeps: (job) => !(job.lane.key === "integration" && job.mode === "served"),
		complete: false,
	},
} as const satisfies Record<string, Profile>;

export type ProfileKey = keyof typeof profiles;

export const isProfile = (value: string): value is ProfileKey =>
	value in profiles;

export default profiles;
