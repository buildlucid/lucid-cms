import pc from "picocolors";
import stringWidth from "string-width";
import describeTest from "../utils/describe-test.ts";
import fitText from "../utils/fit-text.ts";
import formatDuration from "../utils/format-duration.ts";
import describeCount from "./describe-count.ts";
import describeRun from "./describe-run.ts";
import formatLane from "./format-lane.ts";
import type { JobState, JobStatus, RunState } from "./types.ts";

const SPINNER = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
/** A running lane that has reported nothing for this long says so, as it may be stuck. */
const QUIET_MS = 30_000;
/** Busy lanes come first, so a block cut to the terminal's height shows them. */
const ORDER: Record<JobStatus, number> = {
	running: 0,
	preparing: 1,
	waiting: 2,
	passed: 3,
	failed: 3,
};

type Frame = {
	/** The terminal's size. */
	width: number;
	height: number;
	now: number;
};

const spin = (now: number): string =>
	SPINNER[Math.floor(now / 80) % SPINNER.length] ?? "·";

const describeTestIn = (test: { file: string; name: string }) =>
	describeTest(test.file, test.name.split(" > "));

/**
 * What follows a running lane's time: that it has gone quiet and the oldest test it is running,
 * or how far a long test that reports progress has got.
 */
const describeRunning = (job: JobState, now: number): string | undefined => {
	const oldest = job.running.toSorted((a, b) => a.startedAt - b.startedAt);
	if (job.activeAt !== undefined && now - job.activeAt > QUIET_MS) {
		const [test] = oldest;
		return pc.yellow(
			`quiet for ${formatDuration(now - job.activeAt)}${test ? ` · ${describeTestIn(test)}` : ""}`,
		);
	}
	const long = oldest.find((test) => test.progress);
	return long?.progress
		? pc.dim(
				`${describeTestIn(long)} ${long.progress.done}/${long.progress.total}`,
			)
		: undefined;
};

/** A row in the status block, cut to the terminal's width. */
const renderRow = (
	state: RunState,
	job: JobState,
	now: number,
	width: number,
): string => {
	const columns = state.columns;
	switch (job.status) {
		case "waiting":
		case "preparing": {
			const waiting = job.status === "waiting";
			return fitText(
				formatLane({
					job,
					columns,
					icon: pc.dim(waiting ? "◌" : spin(now)),
					detail: pc.dim(waiting ? "waiting" : (job.phase ?? "preparing")),
				}),
				width,
			);
		}
		default: {
			const line = formatLane({
				job,
				columns,
				icon: pc.cyan(spin(now)),
				detail: [
					describeCount(job),
					job.tests.failed > 0 ? pc.red(`${job.tests.failed} failed`) : null,
				]
					.filter((part) => part !== null)
					.join("  "),
				time: `${formatDuration(now - (job.startedAt ?? now))}${job.previousMs ? ` of ~${formatDuration(job.previousMs)}` : ""}`,
			});
			const after = describeRunning(job, now);
			const room = width - stringWidth(line) - 2;
			return fitText(
				after && room > 0 ? `${line}  ${fitText(after, room, "middle")}` : line,
				width,
			);
		}
	}
};

/**
 * Renders unfinished lanes and overall progress. Prioritizes busy rows when terminal height is
 * limited. Pure rendering also supports saved state in `status`.
 */
const renderStatus = (state: RunState, frame: Frame): string => {
	const { now } = frame;
	//* a line as wide as the terminal makes some terminals wrap it, so the block keeps one column free
	const width = Math.max(20, frame.width - 1);
	const unfinished = state.jobs
		.filter((job) => job.finishedAt === undefined)
		.toSorted((a, b) => ORDER[a.status] - ORDER[b.status]);
	const rows = unfinished.map((job) => renderRow(state, job, now, width));

	//* the rule and the summary take two lines, and one stays free for the cursor
	const room = Math.max(1, frame.height - 3);
	const shown =
		rows.length > room
			? [
					...rows.slice(0, room - 1),
					pc.dim(`… and ${rows.length - room + 1} more lanes`),
				]
			: rows;

	return [
		pc.dim("─".repeat(width)),
		...shown,
		fitText(describeRun(state, now), width),
	].join("\n");
};

export default renderStatus;
