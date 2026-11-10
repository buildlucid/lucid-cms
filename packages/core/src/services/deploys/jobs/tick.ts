import z from "zod";
import constants from "../../../constants/constants.js";
import defineJob from "../../../libs/jobs/define-job.js";
import type { JobService } from "../../../libs/jobs/types.js";
import logger from "../../../libs/logger/index.js";
import { LucidError } from "../../../utils/errors/index.js";
import checkRuns from "../check-runs.js";
import dispatchTriggers from "../dispatch-triggers.js";
import expireRuns from "../expire-runs.js";
import startQueuedRuns from "../start-queued-runs.js";

/** Times out stuck runs, turns quiet triggers into runs, starts queued runs and checks running ones. */
const tick: JobService = async ({ context }) => {
	//* log returned service errors and continue with later steps
	for (const step of [
		expireRuns,
		dispatchTriggers,
		startQueuedRuns,
		checkRuns,
	]) {
		const result = await step(context);
		if (result.error) {
			logger.error({
				message: `Deploy tick step ${step.name} failed: ${context.translate(result.error.message)}`,
				scope: constants.logScopes.deploys,
			});
		}
	}

	return { error: undefined, data: undefined };
};

/** Registered only when deploys are configured. */
export const deploysTickJob = defineJob({
	key: "core:deploys-tick",
	version: 1,
	input: z.null(),
	notifyOnFailure: false,
	schedules: [
		{ key: "automatic", cron: "* * * * *", timezone: "UTC", input: null },
	],
	handler: async (args) => {
		const result = await tick(args);
		if (result.error) throw new LucidError(result.error);
	},
});
