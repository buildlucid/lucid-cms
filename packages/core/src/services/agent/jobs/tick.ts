import z from "zod";
import constants from "../../../constants/constants.js";
import { getAgents } from "../../../libs/agent/registry.js";
import defineJob from "../../../libs/jobs/define-job.js";
import type { JobService } from "../../../libs/jobs/types.js";
import logger from "../../../libs/logger/index.js";
import { AgentRunsRepository } from "../../../libs/repositories/index.js";
import { LucidError } from "../../../utils/errors/index.js";
import dispatchDueRoutines from "../dispatch-due-routines.js";
import dispatchEventRoutines from "../dispatch-event-routines.js";
import expireScreenCalls from "../expire-screen-calls.js";
import notifyWaitingRuns from "../notify-waiting-runs.js";
import reconcileUsage from "../reconcile-usage.js";
import recoverInputs from "../recover-inputs.js";
import recoverRuns from "../recover-runs.js";
import resumeSubagentWaits from "../resume-subagent-waits.js";

/** Recovers agent work, dispatches routines, expires screen calls, resumes finished sub-agent waits, notifies waiting users and reconciles usage. */
const tick: JobService = async ({ context }) => {
	if (getAgents(context.config).length === 0) {
		return { error: undefined, data: undefined };
	}

	//* log returned service errors and continue with later steps
	for (const step of [
		recoverInputs,
		recoverRuns,
		dispatchDueRoutines,
		dispatchEventRoutines,
		expireScreenCalls,
		resumeSubagentWaits,
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

/**
 * Runs the agent tick in each minute with agent work in flight, so an idle site stores no job for
 * it. Registered only when agents are in use.
 */
export const agentTickJob = defineJob({
	key: "core:agent-tick",
	version: 1,
	input: z.null(),
	schedules: [
		{
			key: "automatic",
			cron: "* * * * *",
			timezone: "UTC",
			input: null,
			when: async ({ context }) => {
				const Runs = new AgentRunsRepository(context.db);
				const work = await Runs.hasTickWork({ now: new Date().toISOString() });
				if (work.error) throw new LucidError(work.error);
				return work.data;
			},
		},
	],
	handler: async (args) => {
		const result = await tick(args);
		if (result.error) throw new LucidError(result.error);
	},
});
