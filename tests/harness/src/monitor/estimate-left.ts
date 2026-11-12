import type { JobState, RunState } from "./types.ts";

/**
 * Estimates remaining time from prior lane durations and concurrency rules. Returns undefined
 * without complete history. Excludes setup and build time, so early estimates may be short.
 */
const estimateLeft = (state: RunState, now: number): number | undefined => {
	const unfinished = state.jobs.filter((job) => job.finishedAt === undefined);
	if (unfinished.some((job) => job.previousMs === undefined)) {
		return undefined;
	}

	const left = (job: JobState) =>
		Math.max(0, (job.previousMs ?? 0) - (now - (job.startedAt ?? now)));
	let alone = 0;
	//* lanes that take turns add up into one chain, and the longest chain bounds the rest
	const chains = new Map<string, number>();
	for (const job of unfinished) {
		if (job.exclusive) {
			alone += left(job);
			continue;
		}
		const chain = job.mode === "served" ? `${job.setup}/served` : job.key;
		chains.set(chain, (chains.get(chain) ?? 0) + left(job));
	}
	const total = [...chains.values()].reduce((sum, time) => sum + time, 0);
	const longest = Math.max(0, ...chains.values());
	return Math.max(longest, total / state.concurrency) + alone;
};

export default estimateLeft;
