import path from "node:path";
import type { SetupPlan } from "../cli/types.ts";
import createProgressReader, {
	type ProgressReader,
} from "../progress/create-progress-reader.ts";
import summarize from "../report/summarize.ts";
import type { History, LaneReport } from "../report/types.ts";
import createJobKey from "../utils/create-job-key.ts";
import { writeJson } from "../utils/json.ts";
import applyEvent from "./apply-event.ts";
import createLiveView from "./create-live-view.ts";
import createPlainView from "./create-plain-view.ts";
import type { JobState, RunState } from "./types.ts";

/** How often running jobs' events files are read. */
const POLL_MS = 250;
/** How often `status.json` is written while the run goes on. */
const STATUS_MS = 2000;

export const STATUS_FILE = "status.json";

/** What a job reports to the monitor as it goes. */
export type JobObserver = {
	/** How long its runner took last time, when an earlier run had it. */
	previousMs: number | undefined;
	/** It is waiting on something before its runner can start, such as the server. */
	phase(label: string): void;
	/** Its runner started, writing progress events to `events`. */
	start(events: string): void;
	finish(report: LaneReport): void;
};

/**
 * Tracks lane progress and failures from event files, shows them in the live or plain view and
 * saves `status.json` for `status` in other terminals.
 */
const createMonitor = (options: {
	runId: string;
	directory: string;
	plans: readonly SetupPlan[];
	concurrency: number;
	/** How long each lane took last time, for estimates. */
	history: History;
	/** Whether some files or tests were left out, so earlier full runs say nothing about this one. */
	filtered: boolean;
	/** Prints plain lines instead of drawing the status block. */
	plain: boolean;
}) => {
	const jobs = options.plans.flatMap(({ jobs }) =>
		jobs.map((job): JobState => {
			const key = createJobKey({
				setup: job.setup.name,
				lane: job.lane.key,
				mode: job.mode,
			});
			return {
				key,
				setup: job.setup.name,
				lane: job.lane.key,
				mode: job.mode,
				exclusive: job.lane.exclusive === true,
				status: "waiting",
				previousMs: options.filtered ? undefined : options.history.lanes[key],
				files: { collected: 0 },
				tests: { total: 0, done: 0, failed: 0 },
				running: [],
			};
		}),
	);
	const state: RunState = {
		runId: options.runId,
		pid: process.pid,
		startedAt: Date.now(),
		stopping: false,
		concurrency: options.concurrency,
		columns: {
			setup: Math.max(...jobs.map((job) => job.setup.length)),
			lane: Math.max(...jobs.map((job) => `${job.lane} ${job.mode}`.length)),
		},
		jobs,
	};
	const view = options.plain ? createPlainView(state) : createLiveView(state);

	const readers = new Map<string, ProgressReader>();
	const poll = async () => {
		for (const job of jobs) {
			const reader = readers.get(job.key);
			if (!reader) {
				continue;
			}
			for (const event of await reader.read()) {
				const test = applyEvent(job, event);
				if (test?.status === "failed") {
					view.notify({ type: "test-failed", job, test });
				}
			}
		}
	};

	const writeStatus = () =>
		writeJson(path.join(options.directory, STATUS_FILE), state).catch(
			() => undefined,
		);

	//* polls run one after another, and the timer only adds one when none is waiting
	let polling = Promise.resolve();
	let waiting = false;
	const pollTimer = setInterval(() => {
		if (waiting) {
			return;
		}
		waiting = true;
		polling = polling
			.then(() => {
				waiting = false;
				return poll();
			})
			//* progress is only for display, so a failed read waits for the next poll
			.catch(() => undefined);
	}, POLL_MS);
	//* the timers only read and save, so they never keep the process alive
	const statusTimer = setInterval(writeStatus, STATUS_MS);
	pollTimer.unref();
	statusTimer.unref();
	void writeStatus();

	const find = (key: string): JobState => {
		const job = jobs.find((candidate) => candidate.key === key);
		if (!job) {
			throw new Error(`The monitor has no job ${key}.`);
		}
		return job;
	};

	return {
		state,
		/** A step of the run before lanes take over, such as starting Docker services. */
		phase: (message: string) => {
			view.notify({ type: "phase", message });
		},
		warn: (message: string) => {
			view.notify({ type: "warning", message });
		},
		stopping: () => {
			state.stopping = true;
			view.notify({ type: "stopping" });
		},
		job: (key: string): JobObserver => {
			const job = find(key);
			return {
				previousMs: job.previousMs,
				phase: (label) => {
					job.status = "preparing";
					job.phase = label;
				},
				start: (events) => {
					job.status = "running";
					job.phase = undefined;
					job.startedAt = Date.now();
					job.activeAt = job.startedAt;
					readers.set(job.key, createProgressReader(events));
				},
				finish: (report) => {
					//* events written just before the runner exited are read first
					polling = polling
						.then(poll)
						.catch(() => undefined)
						.then(() => {
							readers.delete(job.key);
							const summary = summarize([report]);
							job.status =
								summary.failed > 0 || report.errors.length > 0
									? "failed"
									: "passed";
							job.phase = undefined;
							job.running = [];
							job.finishedAt = Date.now();
							job.result = {
								summary,
								measurements: report.measurements.length,
								errors: report.errors.map(
									(error) => error.split("\n")[0] ?? "",
								),
							};
							view.notify({ type: "job-end", job });
						});
				},
			};
		},
		/** Stops reading and drawing, and saves the final state. */
		finish: async () => {
			clearInterval(pollTimer);
			clearInterval(statusTimer);
			await polling;
			state.finishedAt = Date.now();
			view.stop();
			await writeStatus();
		},
	};
};

export type Monitor = ReturnType<typeof createMonitor>;

export default createMonitor;
