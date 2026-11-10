import z from "zod";
import { getDeployCallbackUrl } from "../../../libs/deploys/callback.js";
import { getDeploy } from "../../../libs/deploys/registry.js";
import type { DeployTriggerResult } from "../../../libs/deploys/types.js";
import { copy } from "../../../libs/i18n/index.js";
import defineJob from "../../../libs/jobs/define-job.js";
import type {
	JobService,
	JobPermanentFailureHandler,
} from "../../../libs/jobs/types.js";
import {
	DeployOverridesRepository,
	DeployRunsRepository,
} from "../../../libs/repositories/index.js";
import { LucidError } from "../../../utils/errors/index.js";
import withTransaction from "../../../utils/services/with-transaction.js";
import applyRunUpdate from "../helpers/apply-run-update.js";

type StartRunInput = { runId: number };

/** Hands a starting run to its provider and records what the host said. Throws from the provider retry the job. */
const startRun: JobService<StartRunInput> = async ({ context, input }) => {
	const DeployRuns = new DeployRunsRepository(context.db);
	const DeployOverrides = new DeployOverridesRepository(context.db);

	const runRes = await DeployRuns.selectSingle({
		select: ["id", "deploy_key", "status", "source", "trigger_count"],
		where: [{ key: "id", operator: "=", value: input.runId }],
	});
	if (runRes.error) return runRes;
	const run = runRes.data;
	if (run?.status !== "starting") return { error: undefined, data: undefined };

	const deploy = getDeploy(context.config, run.deploy_key);
	if (!deploy) {
		const failed = await DeployRuns.updateSingle({
			data: {
				status: "failed",
				message: context.translate(copy("server:core.deploys.not.configured")),
				finished_at: new Date().toISOString(),
			},
			where: [{ key: "id", operator: "=", value: run.id }],
		});
		if (failed.error) return failed;
		return { error: undefined, data: undefined };
	}

	const override = await DeployOverrides.selectSingle({
		select: ["id"],
		where: [{ key: "deploy_key", operator: "=", value: deploy.key }],
	});
	if (override.error) return override;
	if (override.data) {
		return withTransaction(context, (context) =>
			applyRunUpdate(context, {
				deploy,
				runId: run.id,
				update: { status: "cancelled" },
			}),
		);
	}

	let result: DeployTriggerResult;
	try {
		result = await deploy.provider.trigger(context, {
			id: run.id,
			deployKey: deploy.key,
			source: run.source,
			triggerCount: run.trigger_count,
			callbackUrl: getDeployCallbackUrl(context, run.id),
		});
	} catch (error) {
		return {
			error: {
				type: "basic",
				message: copy.literal(
					error instanceof Error
						? error.message
						: context.translate(copy("server:core.deploys.trigger.failed")),
				),
				cause: error,
			},
			data: undefined,
		};
	}

	return withTransaction(context, (context) =>
		applyRunUpdate(context, {
			deploy,
			runId: run.id,
			update: result,
		}),
	);
};

/** Fails a run whose provider kept throwing, so its slot frees up for the next run. */
const failRun: JobPermanentFailureHandler<StartRunInput> = async ({
	context,
	failure,
}) => {
	const DeployRuns = new DeployRunsRepository(context.db);
	const runRes = await DeployRuns.selectSingle({
		select: ["id", "deploy_key", "status"],
		where: [{ key: "id", operator: "=", value: failure.input.runId }],
	});
	const run = runRes.data;
	if (run?.status !== "starting") return;

	const deploy = getDeploy(context.config, run.deploy_key);
	if (!deploy) return;

	await withTransaction(context, (context) =>
		applyRunUpdate(context, {
			deploy,
			runId: run.id,
			update: { status: "failed", message: failure.errorMessage },
		}),
	);
};

export const startDeployRunJob = defineJob({
	key: "core:deploy-start",
	version: 1,
	input: z.object({ runId: z.number().int().positive() }),
	retry: {
		type: "exponential",
		maxAttempts: 3,
		baseDelayMs: 10_000,
		maxDelayMs: 60_000,
		jitter: "full",
	},
	notifyOnFailure: false,
	describe: ({ input }) => ({ runId: input.runId }),
	handler: async (args) => {
		const result = await startRun(args);
		if (result.error) throw new LucidError(result.error);
	},
	onPermanentFailure: failRun,
});
