import z from "zod";
import constants from "../../../constants/constants.js";
import { getAgents } from "../../../libs/agent/registry.js";
import defineJob from "../../../libs/jobs/define-job.js";
import type { JobHandler } from "../../../libs/jobs/types.js";
import logger from "../../../libs/logger/index.js";
import dispatchDueRoutines from "../dispatch-due-routines.js";
import expireScreenCalls from "../expire-screen-calls.js";
import notifyWaitingRuns from "../notify-waiting-runs.js";
import reconcileUsage from "../reconcile-usage.js";
import recoverInputs from "../recover-inputs.js";
import recoverRuns from "../recover-runs.js";

/** Recovers agent work, starts due routines, expires unanswered screen calls, notifies waiting users and settles usage. */
const tick: JobHandler = async ({ context }) => {
	if (getAgents(context.config).length === 0) {
		return { error: undefined, data: undefined };
	}

	//* log returned service errors and continue with later steps
	for (const step of [
		recoverInputs,
		recoverRuns,
		dispatchDueRoutines,
		expireScreenCalls,
		notifyWaitingRuns,
		reconcileUsage,
	]) {
		const result = await step(context);
		if (result.error) {
			logger.error({
				message: `Agent tick step ${step.name} failed: ${context.translate(result.error.message)}`,
				scope: constants.logScopes.ai,
			});
		}
	}

	return { error: undefined, data: undefined };
};

export const agentTickJob = defineJob({
	name: "core:agent-tick",
	version: 1,
	input: z.null(),
	schedules: [
		{ name: "automatic", cron: "* * * * *", timezone: "UTC", input: null },
	],
	handler: tick,
});
