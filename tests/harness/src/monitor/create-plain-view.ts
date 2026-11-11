import pc from "picocolors";
import formatDuration from "../utils/format-duration.ts";
import { describeResult, describeTest } from "./render-dashboard.ts";
import type { JobState, RunState, RunView } from "./types.ts";

/** How often a line says the run is still going, when nothing else has been printed. */
const HEARTBEAT_MS = 30_000;

const name = (job: JobState) => `${job.setup} ${job.lane} (${job.mode})`;

/** One line on where the run has got to, such as which lanes are running and how far. */
export const describeProgress = (state: RunState, now: number): string => {
	const done = state.jobs.filter((job) => job.finishedAt !== undefined).length;
	const running = state.jobs
		.filter((job) => job.status === "running")
		.map(
			(job) =>
				`${name(job)} ${job.tests.done}/${job.tests.total > 0 ? job.tests.total : "?"}`,
		);
	const preparing = state.jobs.filter(
		(job) => job.status === "preparing",
	).length;
	return [
		`${formatDuration(now - state.startedAt)} elapsed`,
		`${done}/${state.jobs.length} lanes done`,
		running.length > 0 ? `running ${running.join(", ")}` : null,
		preparing > 0 ? `${preparing} preparing` : null,
	]
		.filter((part) => part !== null)
		.join(" · ");
};

/** Prints events for CI and pipes, with periodic status updates during quiet periods. */
const createPlainView = (): RunView => {
	let latest: RunState | undefined;
	let printedAt = Date.now();
	const print = (line: string) => {
		console.log(line);
		printedAt = Date.now();
	};

	const timer = setInterval(() => {
		if (latest && Date.now() - printedAt >= HEARTBEAT_MS) {
			print(pc.dim(`… ${describeProgress(latest, Date.now())}`));
		}
	}, 1000);
	timer.unref();

	return {
		render: (state) => {
			latest = state;
		},
		notify: (note) => {
			switch (note.type) {
				case "phase": {
					print(pc.dim(`· ${note.message}`));
					return;
				}
				case "warning": {
					print(pc.yellow(`! ${note.message}`));
					return;
				}
				case "job-start": {
					print(`${pc.cyan("▶")} ${name(note.job)}`);
					return;
				}
				case "job-end": {
					const { job } = note;
					const took = formatDuration(
						(job.finishedAt ?? 0) - (job.startedAt ?? job.finishedAt ?? 0),
					);
					print(
						`${job.status === "failed" ? pc.red("✗") : pc.green("✓")} ${name(job)} ${describeResult(job)} ${pc.dim(took)}`,
					);
					for (const error of job.result?.errors ?? []) {
						print(`  ${pc.red(error)}`);
					}
					return;
				}
				case "test-failed": {
					const { test } = note;
					print(
						`  ${pc.red("✗")} ${note.job.setup} ${describeTest(test)}${test.error ? pc.dim(`: ${test.error}`) : ""}`,
					);
					return;
				}
			}
		},
		stop: () => {
			clearInterval(timer);
		},
	};
};

export default createPlainView;
