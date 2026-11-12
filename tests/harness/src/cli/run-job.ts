import path from "node:path";
import applyChanges from "../capabilities/apply-changes.ts";
import type { SetupEnvironment } from "../environment/create-environment.ts";
import { CONTEXT_ENV } from "../environment/load-context.ts";
import type { HarnessContext } from "../environment/types.ts";
import type { JobObserver } from "../monitor/create-monitor.ts";
import type { LaneReport, LaneResult } from "../report/types.ts";
import type { Mode } from "../setup/types.ts";
import type { Limiter } from "../utils/create-limiter.ts";
import formatDuration from "../utils/format-duration.ts";
import { readJson, writeJson } from "../utils/json.ts";
import { paths } from "../utils/paths.ts";
import { startCommand } from "../utils/run-command.ts";
import describeTarget from "./describe-target.ts";
import type { Job, RunOptions } from "./types.ts";

/** What a job waits on before its runner can start, for each mode. */
const PREPARING: Record<Mode, string> = {
	host: "preparing the database",
	served: "building and starting the server",
	project: "waiting",
};

/**
 * Runs one lane against a setup: prepares what its mode needs, waits for a free slot, writes the
 * context file, runs the lane's command and reads back its results. A lane that runs longer than
 * the job timeout is stopped.
 */
const runJob = async (options: {
	job: Job;
	environment: SetupEnvironment;
	runId: string;
	/** The run's output folder. */
	runDirectory: string;
	/** The setup's folder inside it. */
	directory: string;
	run: RunOptions;
	/** Shows the test runner's output in the terminal instead of a log file. */
	live: boolean;
	slots: Limiter;
	observer: JobObserver;
	/** Aborted when the run is cancelled, so jobs that have not started never do. */
	signal: AbortSignal;
}): Promise<LaneReport> => {
	const { job, environment, directory, observer, signal } = options;
	const name = `${job.lane.key}-${job.mode}`;
	const contextPath = path.join(directory, `${name}.context.json`);
	const log = path.join(directory, `${name}.log`);
	const events = path.join(directory, `${name}.events.ndjson`);

	observer.phase(PREPARING[job.mode]);
	const { target, capabilities } = await describeTarget(job.mode, environment);
	observer.phase("waiting for its turn");

	return options.slots(
		async () => {
			if (signal.aborted) {
				throw new Error("The run was stopped before this lane started.");
			}

			const context: HarnessContext = {
				runId: options.runId,
				setup: job.setup,
				lane: job.lane.key,
				mode: job.mode,
				capabilities: applyChanges(capabilities, { add: [`mode:${job.mode}`] }),
				target,
				seed: options.run.seed,
				simulationRuns: options.run.simulationRuns,
				performanceRuns: options.run.performanceRuns,
				workers: options.run.workers,
				cmsEnv: environment.cmsEnv,
				paths: {
					work: environment.work,
					report: path.join(directory, `${name}.result.json`),
					events,
					outbox: environment.outbox,
					ledger: environment.ledger,
				},
			};
			await writeJson(contextPath, context);

			//* started after the target is ready, so a server's build does not count as test time
			const startedAt = Date.now();
			observer.start({ events, log: options.live ? undefined : log });
			const running = await startCommand({
				...job.lane.command({
					filters: job.filters,
					passthrough: options.run.passthrough,
				}),
				cwd: paths.root,
				env: { [CONTEXT_ENV]: contextPath },
				output: options.live ? "inherit" : log,
			});
			let timedOut = false;
			const timer = setTimeout(() => {
				timedOut = true;
				void running.stop();
			}, options.run.jobTimeoutMs);
			const exitCode = await running.exit.finally(() => clearTimeout(timer));
			//* stops what the lane left in its process group, such as a CMS a timed-out test started
			await running.stop();

			const result = await readJson<LaneResult>(context.paths.report).catch(
				(): LaneResult => ({
					tests: [],
					measurements: [],
					errors: [
						`The lane wrote no results and exited with code ${exitCode}.`,
					],
				}),
			);
			//* a runner can fail without any test failing, such as on a bad config
			const failedSilently =
				exitCode !== 0 &&
				result.errors.length === 0 &&
				result.tests.every((test) => test.status !== "failed");
			const stoppedBecause = timedOut
				? `The lane was stopped after ${formatDuration(options.run.jobTimeoutMs)}, its time limit. Raise it with --job-timeout.`
				: signal.aborted
					? "The lane was stopped because the run was cancelled."
					: undefined;

			return {
				...result,
				//* a stopped runner's own errors only say that it was stopped
				errors: stoppedBecause
					? [stoppedBecause]
					: failedSilently
						? [`The lane exited with code ${exitCode}.`]
						: result.errors,
				setup: job.setup.name,
				lane: job.lane.key,
				mode: job.mode,
				durationMs: Date.now() - startedAt,
				log: options.live
					? undefined
					: path.relative(options.runDirectory, log),
				filtered:
					job.filters.files.length > 0 ||
					job.filters.tests.length > 0 ||
					options.run.passthrough.length > 0
						? true
						: undefined,
			};
		},
		//* the longest lanes start first, so the run is not left waiting on one at the end
		observer.previousMs ?? Number.MAX_SAFE_INTEGER,
	);
};

export default runJob;
