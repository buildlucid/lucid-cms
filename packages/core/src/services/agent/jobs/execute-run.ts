import z from "zod";
import defineJob from "../../../libs/jobs/define-job.js";
import { jobPayloadSchema } from "../../../libs/jobs/payload.js";
import type { JobHandler } from "../../../libs/jobs/types.js";
import executeRun from "../execute-run.js";
import resolveSliceStart from "../helpers/resolve-slice-start.js";

const answerSchema = z
	.object({
		interactionId: z.string().min(1),
		response: jobPayloadSchema,
		userId: z.number().int().positive(),
	})
	.strict();

const execute: JobHandler<{
	runId: string;
	answer?: z.infer<typeof answerSchema>;
}> = async ({ context, input, execution }) => {
	const answer = input.answer && { ...input.answer, action: "submit" as const };

	//* A runner owns execution, so the job only hands the run over, with an answer it checks first
	const runner = context.agentRunner;
	if (runner) {
		if (answer) {
			const checked = await resolveSliceStart(context, {
				runId: input.runId,
				answer,
			});
			if (checked.error && checked.error.status !== 409) return checked;
			if (checked.error) return { error: undefined, data: undefined };
		}

		const started = await runner.start(context, { runId: input.runId, answer });
		if (started.error) return started;

		return { error: undefined, data: undefined };
	}

	const result = await executeRun(context, {
		runId: input.runId,
		signal: execution.signal,
		answer,
	});
	//* A conflict means another worker already owns or finished the run.
	if (result.error && result.error.status !== 409) return result;

	return { error: undefined, data: undefined };
};

export const executeAgentRunJob = defineJob({
	name: "core:execute-agent-run",
	version: 1,
	input: z
		.object({
			runId: z.uuid(),
			/** Answers the interaction the run waits on, eg. a screen call that timed out. */
			answer: answerSchema.optional(),
		})
		.strict(),
	retry: { type: "none" },
	handler: execute,
});
