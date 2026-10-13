import z from "zod";
import defineJob from "../../../libs/jobs/define-job.js";
import { jobPayloadSchema } from "../../../libs/jobs/payload.js";
import type { JobHandler } from "../../../libs/jobs/types.js";
import executeRun from "../execute-run.js";

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
	const result = await executeRun(context, {
		runId: input.runId,
		signal: execution.signal,
		answer: input.answer && { ...input.answer, action: "submit" },
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
