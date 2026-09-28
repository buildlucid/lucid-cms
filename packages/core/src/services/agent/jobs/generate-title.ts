import z from "zod";
import defineJob from "../../../libs/jobs/define-job.js";
import type { JobHandler } from "../../../libs/jobs/types.js";
import { AgentConversationsRepository } from "../../../libs/repositories/index.js";
import generateTitle from "../helpers/generate-title.js";

const execute: JobHandler<{
	conversationId: string;
	requestedAt: string;
	scope: "first-message" | "conversation";
	runId?: string;
}> = async ({ context, input, execution }) => {
	const AgentConversations = new AgentConversationsRepository(context.db);

	const current = await AgentConversations.selectSingle({
		select: ["title_status", "title_generation_requested_at", "user_id"],
		where: [{ key: "id", operator: "=", value: input.conversationId }],
	});
	if (current.error) return current;
	if (
		current.data?.title_status !== "provisional" ||
		(current.data.title_generation_requested_at instanceof Date
			? current.data.title_generation_requested_at.toISOString()
			: current.data.title_generation_requested_at) !== input.requestedAt
	) {
		return { error: undefined, data: undefined };
	}

	const result = await generateTitle(context, {
		conversationId: input.conversationId,
		userId: current.data.user_id,
		scope: input.scope,
		runId: input.runId,
		idempotencyKey: execution.jobId,
	});
	if (result.error) return result;

	const saved = await AgentConversations.completeGeneratedTitle({
		conversationId: input.conversationId,
		requestedAt: input.requestedAt,
		title: result.data,
	});
	if (saved.error) return saved;

	return { error: undefined, data: undefined };
};

export const generateAgentTitleJob = defineJob({
	name: "core:generate-agent-title",
	version: 1,
	input: z
		.object({
			conversationId: z.uuid(),
			requestedAt: z.iso.datetime(),
			scope: z.enum(["first-message", "conversation"]),
			runId: z.uuid().optional(),
		})
		.strict(),
	handler: execute,
	onPermanentFailure: async ({ context, failure }) => {
		const AgentConversations = new AgentConversationsRepository(context.db);
		await AgentConversations.clearTitleGenerationRequest({
			conversationId: failure.input.conversationId,
			requestedAt: failure.input.requestedAt,
		});
	},
});
