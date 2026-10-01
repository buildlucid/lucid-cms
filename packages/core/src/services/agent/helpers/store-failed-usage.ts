import { AiGenerationsRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import type { UsageRequest } from "./store-usage.js";

/** Settles a request the Lucid service never charged, keeping why it failed. */
const storeFailedUsage: ServiceFn<
	[UsageRequest & { errorMessage: string }],
	undefined
> = async (context, input) => {
	const AiGenerations = new AiGenerationsRepository(context.db);

	const result = await AiGenerations.upsertAgentUsage({
		data: {
			request_id: input.requestId,
			feature_key: input.featureKey,
			feature_version: "v1",
			user_id: input.userId,
			lucid_remote_connection_id: input.connectionId,
			agent_run_id: input.runId,
			session_type: "agent",
			session_id: input.conversationId,
			status: "failed",
			error_message: input.errorMessage,
		},
	});
	if (result.error) return result;

	return { error: undefined, data: undefined };
};

export default storeFailedUsage;
