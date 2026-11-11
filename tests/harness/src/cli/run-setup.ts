import path from "node:path";
import createEnvironment from "../environment/create-environment.ts";
import type { Fakes } from "../fakes/start-fakes.ts";
import type { Monitor } from "../monitor/create-monitor.ts";
import type { LaneReport } from "../report/types.ts";
import createJobKey from "../utils/create-job-key.ts";
import createLimiter, { type Limiter } from "../utils/create-limiter.ts";
import runJob from "./run-job.ts";
import type { Job, RunOptions, SetupPlan } from "./types.ts";

/** Reports a job that could not run because of a failure around it, such as a failed build. */
const failJob = (job: Job, error: unknown): LaneReport => ({
	setup: job.setup.name,
	lane: job.lane.key,
	mode: job.mode,
	durationMs: 0,
	tests: [],
	measurements: [],
	errors: [error instanceof Error ? error.message : String(error)],
});

/**
 * Runs jobs as their prerequisites and slots become available, overlapping host tests with builds.
 * Serializes served lanes to protect shared database measurements. Reports preparation failures
 * and continues; always cleans up.
 */
const runSetup = async (options: {
	plan: SetupPlan;
	runId: string;
	/** The run's output folder. */
	directory: string;
	run: RunOptions;
	live: boolean;
	slots: Limiter;
	monitor: Monitor;
	signal: AbortSignal;
	fakes: Fakes;
}): Promise<LaneReport[]> => {
	const { setup, jobs } = options.plan;
	const directory = path.join(options.directory, setup.name);
	const environment = createEnvironment({
		setup,
		runId: options.runId,
		directory,
		fakes: options.fakes,
	});

	//* waits for its turn on the server before taking a slot, so it holds no slot while it waits
	const serverTurn = createLimiter(1);
	const servedSlots: Limiter = (task, priority) =>
		serverTurn(() => options.slots(task, priority), priority);

	try {
		return await Promise.all(
			jobs.map(async (job) => {
				const observer = options.monitor.job(
					createJobKey({
						setup: setup.name,
						lane: job.lane.key,
						mode: job.mode,
					}),
				);
				const report = await runJob({
					job,
					environment,
					runId: options.runId,
					runDirectory: options.directory,
					directory,
					run: options.run,
					live: options.live,
					slots: job.mode === "served" ? servedSlots : options.slots,
					observer,
					signal: options.signal,
				}).catch((error: unknown) => failJob(job, error));

				observer.finish(report);
				return report;
			}),
		);
	} finally {
		await environment.destroy();
	}
};

export default runSetup;
