import z from "zod";
import defineJob from "../../../libs/jobs/define-job.js";
import type { JobHandler } from "../../../libs/jobs/types.js";
import dispatchDueRoutines from "../dispatch-due-routines.js";
import reconcileUsage from "../reconcile-usage.js";
import recoverRuns from "../recover-runs.js";

/** Keeps agent work moving: recovers stalled runs, starts due routines and settles usage. */
const tick: JobHandler = async ({ context }) => {
	if (!context.config.ai.enabled || !context.config.ai.agent.enabled) {
		return { error: undefined, data: undefined };
	}

	for (const step of [recoverRuns, dispatchDueRoutines, reconcileUsage]) {
		const result = await step(context);
		if (result.error) return result;
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
