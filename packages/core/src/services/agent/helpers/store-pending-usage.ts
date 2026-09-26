import { AiGenerationsRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/** Persist the request identity before the remote service can incur usage. */
const storePendingUsage: ServiceFn<
	[
		{
			requestId: string;
			purpose?: "compact";
			runId: string;
			conversationId: string;
			userId: number;
			connectionId: number;
		},
	],
	undefined
> = async (context, input) => {
	const AiGenerations = new AiGenerationsRepository(context.db);

	const result = await AiGenerations.createIfRequestAbsent({
		data: {
			request_id: input.requestId,
			provider_request_id: null,
			feature_key: input.purpose ? "agent.compact" : "agent.chat",
			feature_version: "v1",
			user_id: input.userId,
			lucid_remote_connection_id: input.connectionId,
			agent_conversation_id: input.conversationId,
			agent_run_id: input.runId,
			target_type: "agent-run",
			target: { conversationId: input.conversationId, runId: input.runId },
			output: null,
			usage: null,
			model: null,
			credits_charged: null,
			duration_ms: null,
			status: "pending",
			error_message: null,
		},
	});
	if (result.error) return result;

	return { error: undefined, data: undefined };
};

export default storePendingUsage;
