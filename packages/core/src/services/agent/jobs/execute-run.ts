import z from "zod";
import defineJob from "../../../libs/jobs/define-job.js";
import type { JobHandler } from "../../../libs/jobs/types.js";
import executeRun from "../execute-run.js";

const execute: JobHandler<{ runId: string }> = async ({
	context,
	input,
	execution,
}) => {
	const result = await executeRun(context, {
		runId: input.runId,
		signal: execution.signal,
	});
	// A conflict means another worker already owns or finished the run.
	if (result.error && result.error.status !== 409) return result;

	return { error: undefined, data: undefined };
};

export const executeAgentRunJob = defineJob({
	name: "core:execute-agent-run",
	version: 1,
	input: z.object({ runId: z.uuid() }).strict(),
	retry: { type: "none" },
	handler: execute,
});
