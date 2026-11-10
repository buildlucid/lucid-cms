import path from "node:path";
import applyChanges from "../capabilities/apply-changes.ts";
import type { SetupEnvironment } from "../environment/create-environment.ts";
import { CONTEXT_ENV } from "../environment/load-context.ts";
import type { HarnessContext } from "../environment/types.ts";
import type { LaneReport, LaneResult } from "../report/types.ts";
import { readJson, writeJson } from "../utils/json.ts";
import { paths } from "../utils/paths.ts";
import { runCommand } from "../utils/run-command.ts";
import describeTarget from "./describe-target.ts";
import type { Job, RunOptions } from "./types.ts";

/**
 * Runs one lane against a prepared setup: writes the context file, runs the lane's command and
 * reads back its results.
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
}): Promise<LaneReport> => {
	const { job, environment, directory } = options;
	const name = `${job.lane.key}-${job.mode}`;
	const contextPath = path.join(directory, `${name}.context.json`);
	const log = path.join(directory, `${name}.log`);

	const { target, capabilities } = await describeTarget(job.mode, environment);
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
		paths: {
			work: environment.work,
			report: path.join(directory, `${name}.result.json`),
		},
	};
	await writeJson(contextPath, context);

	//* started after the target is ready, so a server's build does not count as test time
	const startedAt = Date.now();
	const exitCode = await runCommand({
		...job.lane.command(options.run.passthrough),
		cwd: paths.root,
		env: { [CONTEXT_ENV]: contextPath },
		output: options.live ? "inherit" : log,
	});

	const result = await readJson<LaneResult>(context.paths.report).catch(
		(): LaneResult => ({
			tests: [],
			measurements: [],
			errors: [`The lane wrote no results and exited with code ${exitCode}.`],
		}),
	);
	//* a runner can fail without any test failing, such as on a bad config
	const failedSilently =
		exitCode !== 0 &&
		result.errors.length === 0 &&
		result.tests.every((test) => test.status !== "failed");

	return {
		...result,
		errors: failedSilently
			? [`The lane exited with code ${exitCode}.`]
			: result.errors,
		setup: job.setup.name,
		lane: job.lane.key,
		mode: job.mode,
		durationMs: Date.now() - startedAt,
		log: options.live ? undefined : path.relative(options.runDirectory, log),
	};
};

export default runJob;
