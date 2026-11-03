import z from "zod";
import constants from "../../../constants/constants.js";
import type { DeployDefinition } from "../../../libs/deploys/types.js";
import { copy } from "../../../libs/i18n/index.js";
import defineJob from "../../../libs/jobs/define-job.js";
import logger from "../../../libs/logger/index.js";
import { getDeployPermission } from "../../../libs/permission/deploy-permissions.js";
import hasAccess from "../../../libs/permission/has-access.js";
import {
	DeployOverridesRepository,
	JobsRepository,
} from "../../../libs/repositories/index.js";
import resolveActorUser from "../../users/helpers/resolve-actor-user.js";
import runDeploy from "../run.js";

/**
 * Registers configured deploy schedules. Disabled deploys skip runs; manual schedule execution
 * requires the deploy's `run` permission.
 */
export const createRunScheduledDeployJob = (
	deploys: readonly DeployDefinition[],
) =>
	defineJob({
		name: "core:deploy-schedule",
		version: 1,
		input: z.object({ deploy: z.string() }),
		transaction: true,
		notifyOnFailure: false,
		schedules: deploys.flatMap((deploy) =>
			deploy.schedule
				? [
						{
							name: deploy.key,
							cron: deploy.schedule,
							timezone: "UTC",
							input: { deploy: deploy.key },
						},
					]
				: [],
		),
		handler: async ({ context, input, execution }) => {
			const Jobs = new JobsRepository(context.db);
			const DeployOverrides = new DeployOverridesRepository(context.db);

			const job = await Jobs.selectSingleById({
				select: ["created_by_user_id"],
				jobId: execution.jobId,
			});
			if (job.error) return job;

			const userId = job.data?.created_by_user_id ?? null;
			if (userId !== null) {
				const user = await resolveActorUser(context, {
					actor: { type: "user", userId },
				});
				if (user.error) return user;
				if (
					!hasAccess({
						user: user.data,
						requiredPermissions: [getDeployPermission(input.deploy, "run")],
					})
				) {
					return {
						error: {
							type: "authorisation",
							status: 403,
							message: copy("server:core.deploys.run.forbidden"),
						},
						data: undefined,
					};
				}
			}

			const override = await DeployOverrides.selectSingle({
				select: ["id"],
				where: [{ key: "deploy_key", operator: "=", value: input.deploy }],
			});
			if (override.error) return override;
			if (override.data) {
				logger.info({
					message: `Skipped the scheduled ${input.deploy} deploy because it's turned off`,
					scope: constants.logScopes.deploys,
				});
				return { error: undefined, data: undefined };
			}

			const run = await runDeploy(context, {
				key: input.deploy,
				source: "schedule",
				userId,
			});
			if (run.error) return run;

			return { error: undefined, data: undefined };
		},
	});
