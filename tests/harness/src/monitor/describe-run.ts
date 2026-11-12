import pc from "picocolors";
import formatDuration from "../utils/format-duration.ts";
import estimateLeft from "./estimate-left.ts";
import type { RunState } from "./types.ts";

/** One line on how far a run has got, such as `9/14 lanes · 1 failed · 5m 12s elapsed · about 4m left`. */
const describeRun = (state: RunState, now: number): string => {
	const done = state.jobs.filter((job) => job.finishedAt !== undefined);
	//* a finished lane's report also counts tests that never started, such as after a failed hook
	const failed = state.jobs.reduce(
		(total, job) => total + (job.result?.summary.failed ?? job.tests.failed),
		0,
	);
	const errors = done.filter((job) => (job.result?.errors.length ?? 0) > 0);
	const left = state.finishedAt ? undefined : estimateLeft(state, now);

	return [
		state.stopping
			? pc.yellow(state.finishedAt ? "stopped" : "stopping")
			: null,
		`${done.length}/${state.jobs.length} lanes`,
		failed > 0 ? pc.red(`${failed} failed`) : null,
		errors.length > 0
			? pc.red(`${errors.length} lane error${errors.length > 1 ? "s" : ""}`)
			: null,
		`${formatDuration((state.finishedAt ?? now) - state.startedAt)} elapsed`,
		left === undefined ? null : `about ${formatDuration(left)} left`,
	]
		.filter((part) => part !== null)
		.join(pc.dim(" · "));
};

export default describeRun;
