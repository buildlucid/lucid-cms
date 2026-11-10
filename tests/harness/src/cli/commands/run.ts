import path from "node:path";
import lanes from "../../lanes/get-lanes.ts";
import buildRunReport from "../../report/build-run-report.ts";
import ensureServices from "../../services/ensure-services.ts";
import { loadSetups } from "../../setup/load-setups.ts";
import { paths } from "../../utils/paths.ts";
import runPool from "../../utils/run-pool.ts";
import createPlan from "../create-plan.ts";
import finishRun from "../finish-run.ts";
import runSetup from "../run-setup.ts";
import type { Job, RunOptions, SetupPlan } from "../types.ts";

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

/** Runs the chosen lanes against the chosen setups, several setups at a time, and reports the results. */
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

	if (options.services) {
		await ensureServices(
			//* lanes that run no CMS need no database
			selectJobs(plans, (job) => job.mode !== "project").map(
				(plan) => plan.setup.database,
			),
			{ directory },
		);
	}

	const run = (subset: SetupPlan[], concurrency: number) =>
		runPool(subset, concurrency, (plan) =>
			runSetup({
				plan,
				runId,
				directory,
				run: options,
				//* live output from several runners at once would be unreadable
				live: jobCount === 1,
			}),
		);

	//* measuring lanes wait until the machine is quiet, then take turns
	const shared = await run(
		selectJobs(plans, (job) => !job.lane.exclusive),
		options.concurrency,
	);
	const exclusive = await run(
		selectJobs(plans, (job) => job.lane.exclusive === true),
		1,
	);
	const reports = [...shared, ...exclusive];

	return finishRun(
		buildRunReport({
			runId,
			startedAt,
			seed: options.seed,
			lanes: reports.flat(),
			complete:
				options.profile === "full" &&
				[options.setups, options.lanes, options.modes].every(
					(filter) => filter.length === 0,
				),
		}),
		directory,
	);
};

export default runCommand;
