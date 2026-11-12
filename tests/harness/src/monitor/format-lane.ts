import pc from "picocolors";
import stringWidth from "string-width";
import type { JobState, RunState } from "./types.ts";

/** Room for a lane's counts, such as `587 passed · 31 n/a`, so the times after them line up. */
const DETAIL_WIDTH = 20;

/**
 * Formats aligned lane columns for status and logs. Leaves wrapping to permanent logs and
 * truncation to the status renderer.
 */
const formatLane = (options: {
	job: JobState;
	columns: RunState["columns"];
	icon: string;
	detail: string;
	time?: string;
}): string => {
	const { job, columns, detail, time } = options;
	const lane = `${job.lane} ${pc.dim(job.mode)}`;

	return `${options.icon} ${[
		job.setup.padEnd(columns.setup),
		`${lane}${" ".repeat(Math.max(0, columns.lane - stringWidth(lane)))}`,
		time === undefined
			? detail
			: `${detail}${" ".repeat(Math.max(0, DETAIL_WIDTH - stringWidth(detail)))}  ${pc.dim(time)}`,
	].join("  ")}`;
};

export default formatLane;
