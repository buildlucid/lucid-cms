import path from "node:path";
import pc from "picocolors";
import createEnvironment from "../environment/create-environment.ts";
import summarize from "../report/summarize.ts";
import type { LaneReport } from "../report/types.ts";
import formatDuration from "../utils/format-duration.ts";
import logger from "../utils/logger.ts";
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

const describeResult = (report: LaneReport): string => {
	const summary = summarize([report]);
	const failed = summary.failed > 0 || report.errors.length > 0;
	const counts = [
		summary.applicable > 0 ? `${summary.passed} passed` : null,
		summary.failed > 0 ? `${summary.failed} failed` : null,
		summary.skipped > 0 ? `${summary.skipped} skipped` : null,
		summary.notApplicable > 0
			? `${summary.notApplicable} not applicable`
			: null,
		report.measurements.length > 0
			? `${report.measurements.length} measurements`
			: null,
		report.errors.length > 0 ? `${report.errors.length} errors` : null,
	]
		.filter((part) => part !== null)
		.join(", ");

	return `${failed ? pc.red("✗") : pc.green("✓")} ${report.lane} (${report.mode}) ${counts} ${pc.dim(formatDuration(report.durationMs))}`;
};

/**
 * Runs a setup's jobs in order and cleans up, whatever happens. A job that cannot be prepared,
 * such as after a failed migration or build, is reported as failed and the rest still run.
 */
const runSetup = async (options: {
	plan: SetupPlan;
	runId: string;
	/** The run's output folder. */
	directory: string;
	run: RunOptions;
	live: boolean;
}): Promise<LaneReport[]> => {
	const { setup, jobs } = options.plan;
	const directory = path.join(options.directory, setup.name);
	const environment = createEnvironment({
		setup,
		runId: options.runId,
		directory,
	});

	const reports: LaneReport[] = [];
	try {
		for (const job of jobs) {
			const report = await runJob({
				job,
				environment,
				runId: options.runId,
				runDirectory: options.directory,
				directory,
				run: options.run,
				live: options.live,
			}).catch((error: unknown) => failJob(job, error));

			reports.push(report);
			logger.step(setup.name, describeResult(report));
		}
	} finally {
		await environment.destroy();
	}

	return reports;
};

export default runSetup;
