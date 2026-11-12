import path from "node:path";
import { getRunPrefix } from "../../databases/create-database-name.ts";
import { resolveDriver } from "../../databases/get-driver.ts";
import startFakes from "../../fakes/start-fakes.ts";
import lanes from "../../lanes/get-lanes.ts";
import createMonitor from "../../monitor/create-monitor.ts";
import buildRunReport from "../../report/build-run-report.ts";
import readHistory from "../../report/read-history.ts";
import updateHistory from "../../report/update-history.ts";
import ensureServices from "../../services/ensure-services.ts";
import { loadSetups } from "../../setup/load-setups.ts";
import createLimiter from "../../utils/create-limiter.ts";
import { paths } from "../../utils/paths.ts";
import { stopAllCommands } from "../../utils/run-command.ts";
import checkBeforeRun from "../check-before-run.ts";
import createPlan from "../create-plan.ts";
import finishRun from "../finish-run.ts";
import profiles from "../profiles.ts";
import pruneRuns from "../prune-runs.ts";
import runSetup from "../run-setup.ts";
import type { Job, RunOptions, SetupPlan } from "../types.ts";

/** The exit code for a run that was cancelled, as shells use for Ctrl+C. */
const STOPPED_EXIT_CODE = 130;

/** A sortable ID for a run, such as `20261110-223015-4821`. */
const createRunId = (now: Date): string => {
	const stamp = now.toISOString().replaceAll(/[-:]/g, "").slice(0, 15);
	return `${stamp.replace("T", "-")}-${String(Math.floor(Math.random() * 10_000)).padStart(4, "0")}`;
};

/** Keeps the jobs that match, and drops setups left with none. */
const selectJobs = (
	plans: SetupPlan[],
	keep: (job: Job) => boolean,
): SetupPlan[] =>
	plans
		.map((plan) => ({ ...plan, jobs: plan.jobs.filter(keep) }))
		.filter((plan) => plan.jobs.length > 0);

/**
 * Runs selected lanes with bounded concurrency, then measurement lanes sequentially. Ctrl+C cleans
 * up and writes a report; a second exits immediately. Removes databases left by test processes,
 * and run folders beyond the newest few.
 */
const runCommand = async (options: RunOptions): Promise<number> => {
	const startedAt = new Date();
	const runId = createRunId(startedAt);
	const directory = path.join(paths.output, "runs", runId);
	const plans = createPlan({
		setups: await loadSetups(),
		lanes,
		filters: options,
	});

	const jobCount = plans.reduce((total, plan) => total + plan.jobs.length, 0);
	if (jobCount === 0) {
		throw new Error(
			"Nothing to run. No setup supports the chosen lanes and modes.",
		);
	}

	await pruneRuns(runId);
	//* one runner's own output is the most useful thing to show, and it would break the status block
	const live = jobCount === 1;
	const history = await readHistory();
	const monitor = createMonitor({
		runId,
		directory,
		plans,
		concurrency: options.concurrency,
		history,
		filtered:
			options.files.length > 0 ||
			options.tests.length > 0 ||
			options.passthrough.length > 0 ||
			options.retry !== undefined,
		plain:
			live || options.plain || !process.stdout.isTTY || Boolean(process.env.CI),
	});

	const controller = new AbortController();
	const stop = () => {
		if (controller.signal.aborted) {
			process.exit(STOPPED_EXIT_CODE);
		}
		controller.abort();
		monitor.stopping();
		void stopAllCommands();
	};
	process.on("SIGINT", stop);
	process.on("SIGTERM", stop);

	for (const warning of await checkBeforeRun(plans)) {
		monitor.warn(warning);
	}
	if (options.services) {
		await ensureServices(
			//* lanes that run no CMS need no database, unless they create their own
			selectJobs(
				plans,
				(job) => job.mode !== "project" || job.lane.database === true,
			).map((plan) => plan.setup.database),
			{ directory, report: monitor.phase, warn: monitor.warn },
		);
	}

	const fakes = await startFakes();
	const run = (plan: SetupPlan, slots: ReturnType<typeof createLimiter>) =>
		runSetup({
			plan,
			runId,
			directory,
			run: options,
			live,
			slots,
			monitor,
			signal: controller.signal,
			fakes,
		});

	const slots = createLimiter(options.concurrency);
	const reports = (
		await Promise.all(
			selectJobs(plans, (job) => !job.lane.exclusive).map((plan) =>
				run(plan, slots),
			),
		)
	).flat();
	//* measuring lanes wait until the machine is quiet, then take turns
	const alone = createLimiter(1);
	for (const plan of selectJobs(plans, (job) => job.lane.exclusive === true)) {
		reports.push(...(await run(plan, alone)));
	}

	await fakes.stop();

	//* test processes that were stopped could not remove their own databases
	for (const driver of new Set(
		plans.map((plan) => resolveDriver(plan.setup.database)),
	)) {
		await driver.sweep?.(getRunPrefix(runId)).catch(() => undefined);
	}

	await monitor.finish();
	process.off("SIGINT", stop);
	process.off("SIGTERM", stop);

	const stopped = controller.signal.aborted;
	const report = buildRunReport({
		runId,
		startedAt,
		seed: options.seed,
		lanes: reports,
		stopped,
		complete:
			profiles[options.profile].complete &&
			!stopped &&
			[
				options.setups,
				options.lanes,
				options.modes,
				options.files,
				options.tests,
			].every((filter) => filter.length === 0) &&
			options.retry === undefined,
	});
	const code = await finishRun(report, { directory, history });
	await updateHistory(report);
	return stopped ? STOPPED_EXIT_CODE : code;
};

export default runCommand;
