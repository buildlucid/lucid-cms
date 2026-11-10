import type { Job } from "./types.ts";

/**
 * Named choices of what a run covers, for `--profile`.
 * - `full` runs everything.
 * - `pr` leaves out the slowest repeat: integration tests against the built server, which
 *   already run in host mode. Browser tests and benchmarks still run.
 */
const profiles = {
	full: () => true,
	pr: (job) => !(job.lane.key === "integration" && job.mode === "served"),
} as const satisfies Record<string, (job: Job) => boolean>;

export type Profile = keyof typeof profiles;

export const isProfile = (value: string): value is Profile => value in profiles;

export default profiles;
