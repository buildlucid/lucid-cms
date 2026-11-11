import path from "node:path";
import type { ProfileKey } from "../cli/profiles.ts";
import type { SetupPlan } from "../cli/types.ts";
import createProgressReader, {
	type ProgressReader,
} from "../progress/create-progress-reader.ts";
import findPreviousLane from "../report/find-previous-lane.ts";
import summarize from "../report/summarize.ts";
import type { LaneReport, RunReport } from "../report/types.ts";
import createJobKey from "../utils/create-job-key.ts";
import { writeJson } from "../utils/json.ts";
import applyEvent from "./apply-event.ts";
import type { FinishedTest, JobState, RunState, RunView } from "./types.ts";

/** How often running jobs' events files are read. */
const POLL_MS = 250;
/** How often `status.json` is written while the run goes on. */
const STATUS_MS = 2000;
/** How many of the slowest tests the state keeps. */
const SLOWEST = 5;

export const STATUS_FILE = "status.json";

/** What a job reports to the monitor as it goes. */
export type JobObserver = {
	/** How long its runner took last time, when an earlier run had it. */
	previousMs: number | undefined;
	/** It is waiting on something before its runner can start, such as the server. */
	phase(label: string): void;
	/** Its runner started, writing events to `events` and output to `log`. */
	start(options: { events: string; log?: string }): void;
	finish(report: LaneReport): void;
};

/** The latest earlier run of exactly these lane runs, unfiltered, for a time estimate. */
const findPreviousRun = (
	reports: readonly RunReport[],
	keys: ReadonlySet<string>,
): RunReport | undefined =>
	reports.find(
		(report) =>
			!report.stopped &&
			report.lanes.length === keys.size &&
			report.lanes.every(
				(lane) => !lane.filtered && keys.has(createJobKey(lane)),
			),
	);

/**
 * Tracks lane progress, failures and slow tests from event files. Updates the view and saves
 * `status.json` for other terminals.
 */
const createMonitor = (options: {
	runId: string;
	profile: ProfileKey;
	seed: number;
	directory: string;
	plans: readonly SetupPlan[];
	/** Earlier reports, newest first, for estimates and comparisons. */
	previous: readonly RunReport[];
	/** Whether some files or tests were left out, so earlier full runs say nothing about this one. */
	filtered: boolean;
	view: RunView;
}) => {
	const { view, previous } = options;
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
				unit: job.lane.exclusive ? "benchmarks" : "tests",
				status: "waiting",
				previousMs: options.filtered
					? undefined
					: findPreviousLane(previous, key)?.durationMs,
				files: { collected: 0, done: 0 },
				tests: { total: 0, done: 0, failed: 0 },
				running: [],
			};
		}),
	);
	const state: RunState = {
		runId: options.runId,
		profile: options.profile,
		seed: options.seed,
		pid: process.pid,
		startedAt: Date.now(),
		stopping: false,
		previousMs: options.filtered
			? undefined
			: findPreviousRun(previous, new Set(jobs.map((job) => job.key)))
					?.durationMs,
		jobs,
		failures: [],
		slowest: [],
		warnings: [],
	};

	const readers = new Map<string, ProgressReader>();
	//* each job's earlier test times, read on first use
	const previousTests = new Map<string, Map<string, number>>();
	const previousTestMs = (
		job: JobState,
		test: Omit<FinishedTest, "previousMs">,
	) => {
		let times = previousTests.get(job.key);
		if (!times) {
			const lane = findPreviousLane(previous, job.key);
			times = new Map(
				lane?.tests.map((record) => [record.id, record.durationMs]),
			);
			previousTests.set(job.key, times);
		}
		//* the same as `createTestId`, as event names are describe blocks and name joined by ` > `
		return times.get(`${job.lane}/${test.file} > ${test.name}`);
	};

	const record = (job: JobState, ended: Omit<FinishedTest, "previousMs">) => {
		const test: FinishedTest = {
			...ended,
			previousMs: previousTestMs(job, ended),
		};
		if (test.status === "failed") {
			state.failures.push(test);
			view.notify({ type: "test-failed", job, test });
		}
		if (test.status === "passed" || test.status === "failed") {
			state.slowest = [...state.slowest, test]
				.sort((a, b) => b.durationMs - a.durationMs)
				.slice(0, SLOWEST);
		}
	};

	const poll = async () => {
		for (const job of jobs) {
			const reader = readers.get(job.key);
			if (!reader) {
				continue;
			}
			for (const event of await reader.read()) {
				const ended = applyEvent(job, event);
				if (ended) {
					record(job, ended);
				}
			}
		}
		view.render(state);
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
	//* the timers only redraw and save, so they never keep the process alive
	const statusTimer = setInterval(writeStatus, STATUS_MS);
	pollTimer.unref();
	statusTimer.unref();
	view.render(state);
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
		/** What the run is doing before any lane starts, or undefined once lanes take over. */
		phase: (message: string | undefined) => {
			state.phase = message;
			if (message) {
				view.notify({ type: "phase", scope: "run", message });
			}
			view.render(state);
		},
		warn: (message: string) => {
			state.warnings.push(message);
			view.notify({ type: "warning", message });
			view.render(state);
		},
		stopping: () => {
			state.stopping = true;
			view.render(state);
		},
		job: (key: string): JobObserver => {
			const job = find(key);
			return {
				previousMs: job.previousMs,
				phase: (label) => {
					job.status = "preparing";
					job.phase = label;
					view.render(state);
				},
				start: ({ events, log }) => {
					job.status = "running";
					job.phase = undefined;
					job.startedAt = Date.now();
					job.activeAt = job.startedAt;
					job.log = log ? path.relative(options.directory, log) : undefined;
					readers.set(job.key, createProgressReader(events));
					view.notify({ type: "job-start", job });
					view.render(state);
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
							view.render(state);
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
			view.stop(state);
			await writeStatus();
		},
	};
};

export type Monitor = ReturnType<typeof createMonitor>;

export default createMonitor;
