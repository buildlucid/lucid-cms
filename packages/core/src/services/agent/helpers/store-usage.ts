import type z from "zod";
import constants from "../../../constants/constants.js";
import type { cmsAgentUsageSchema } from "../../../libs/lucid-remote/schema/ai.js";
import { AiGenerationsRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/** Identifies a paid agent request, with its charged connection added during storage. */
export type PaidRequestRecord = {
	requestId: string;
	featureKey: string;
	/** Null once the run is deleted; its usage still settles. */
	runId: string | null;
	conversationId: string;
	userId: number | null;
};

/** Records what a request was charged. A settled request keeps its first usage. */
const storeUsage: ServiceFn<
	[
		PaidRequestRecord & {
			connectionId: number;
			usage: z.infer<typeof cmsAgentUsageSchema>;
			durationMs: number | null;
		},
	],
	undefined
> = async (context, input) => {
	const AiGenerations = new AiGenerationsRepository(context.db);

	const result = await AiGenerations.upsertAgentUsage({
		data: {
			request_id: input.requestId,
			feature_key: input.featureKey,
			feature_version: constants.agent.usageFeatureVersion,
			user_id: input.userId,
			lucid_remote_connection_id: input.connectionId,
			agent_run_id: input.runId,
			session_type: "agent",
			session_id: input.conversationId,
			provider_request_id: input.usage.providerRequestId ?? null,
			usage: input.usage,
			model: input.usage.model,
			credits: Number(input.usage.cost.creditsCharged),
			input_tokens: input.usage.tokens?.input.total ?? null,
			output_tokens: input.usage.tokens?.output.total ?? null,
			total_tokens: input.usage.tokens?.total ?? null,
			duration_ms: input.durationMs,
			status: "success",
			error_message: null,
		},
	});
	if (result.error) return result;

	return { error: undefined, data: undefined };
};

export default storeUsage;
