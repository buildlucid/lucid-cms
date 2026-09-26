import type { ModelEvent } from "../../../libs/agent/types.js";
import { AiGenerationsRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

const storeUsage: ServiceFn<
	[
		{
			requestId: string;
			purpose?: "compact";
			runId: string;
			conversationId: string;
			userId: number;
			connectionId: number;
			usage: Extract<ModelEvent, { type: "finish" }>["usage"];
			durationMs: number | null;
		},
	],
	undefined
> = async (context, input) => {
	const AiGenerations = new AiGenerationsRepository(context.db);

	const result = await AiGenerations.upsertAgentUsage({
		data: {
			request_id: input.requestId,
			provider_request_id: input.usage.providerRequestId ?? null,
			feature_key: input.purpose ? "agent.compact" : "agent.chat",
			feature_version: "v1",
			user_id: input.userId,
			lucid_remote_connection_id: input.connectionId,
			agent_conversation_id: input.conversationId,
			agent_run_id: input.runId,
			target_type: "agent-run",
			target: { conversationId: input.conversationId, runId: input.runId },
			output: null,
			usage: input.usage,
			model: input.usage.model,
			credits_charged: input.usage.cost.creditsCharged,
			duration_ms: input.durationMs,
			status: "success",
			error_message: null,
		},
	});
	if (result.error) return result;

	return { error: undefined, data: undefined };
};
export default storeUsage;
