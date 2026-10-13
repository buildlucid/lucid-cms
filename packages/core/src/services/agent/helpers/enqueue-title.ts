import constants from "../../../constants/constants.js";
import { enqueueJob } from "../../../libs/jobs/enqueue.js";
import logger from "../../../libs/logger/index.js";
import { AgentConversationsRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import withTransaction from "../../../utils/services/with-transaction.js";
import checkFeatureEnabled from "../../ai/checks/check-feature-enabled.js";
import { generateAgentTitleJob } from "../jobs/generate-title.js";

/** Queues a durable job for provisional chat titles when configuration and organisation permissions allow it. */
const enqueueTitle: ServiceFn<
	[
		{
			conversationId: string;
			userId: number | null;
			scope: "first-message" | "conversation";
			runId?: string;
		},
	],
	undefined
> = async (context, input) => {
	const enabled = await checkFeatureEnabled(context, { feature: "chatTitles" });
	if (enabled.error) return { error: undefined, data: undefined };

	const requestedAt = new Date().toISOString();
	try {
		const queued = await withTransaction(
			context,
			async (writeContext) => {
				const AgentConversations = new AgentConversationsRepository(
					writeContext.db,
				);
				const started = await AgentConversations.beginTitleGeneration({
					conversationId: input.conversationId,
					requestedAt,
				});
				if (started.error) return started;
				if (!started.data) return { error: undefined, data: undefined };

				const job = await enqueueJob(writeContext, {
					job: generateAgentTitleJob,
					payload: {
						conversationId: input.conversationId,
						requestedAt,
						scope: input.scope,
						...(input.runId ? { runId: input.runId } : {}),
					},
					options: { createdByUserId: input.userId ?? undefined },
				});
				if (job.error) return job;

				return { error: undefined, data: undefined };
			},
			{ isolate: true },
		);
		if (queued.error) {
			const AgentConversation = new AgentConversationsRepository(context.db);
			await AgentConversation.clearTitleGenerationRequest({
				conversationId: input.conversationId,
				requestedAt,
			});
			logger.error({
				error: queued.error,
				message: "Agent title job could not be queued",
				scope: constants.logScopes.ai,
				data: { conversationId: input.conversationId },
			});
		}
	} catch (error) {
		logger.error({
			error,
			message: "Agent title job could not be queued",
			scope: constants.logScopes.ai,
			data: { conversationId: input.conversationId },
		});
	}

	return { error: undefined, data: undefined };
};

export default enqueueTitle;
