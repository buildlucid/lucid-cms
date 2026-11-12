import pc from "picocolors";
import describeCount from "./describe-count.ts";
import describeRun from "./describe-run.ts";
import formatNote from "./format-note.ts";
import type { RunState, RunView } from "./types.ts";

/** How often a line says the run is still going, when nothing else has been printed. */
const HEARTBEAT_MS = 30_000;

/**
 * Prints run events for CI, pipes and `--plain`, with periodic status updates during quiet
 * periods.
 */
const createPlainView = (state: RunState): RunView => {
	let printedAt = Date.now();
	const print = (lines: string[]) => {
		console.log(lines.join("\n"));
		printedAt = Date.now();
	};

	const timer = setInterval(() => {
		const now = Date.now();
		if (now - printedAt < HEARTBEAT_MS) {
			return;
		}
		const running = state.jobs
			.filter((job) => job.status === "running")
			.map(
				(job) => `${job.setup} ${job.lane} ${job.mode} ${describeCount(job)}`,
			);
		print([
			pc.dim(
				`… ${[describeRun(state, now), ...(running.length > 0 ? [`running ${running.join(", ")}`] : [])].join(" · ")}`,
			),
		]);
	}, 1000);
	timer.unref();

	return {
		notify: (note) => {
			print(formatNote(note, state));
		},
		stop: () => {
			clearInterval(timer);
		},
	};
};

export default createPlainView;
