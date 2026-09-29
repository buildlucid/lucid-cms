import type z from "zod";
import type { cmsAgentUsageSchema } from "../../../libs/lucid-remote/schema/ai.js";
import { AiGenerationsRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/** Identifies one paid request made for an agent run, and the connection it was charged to. */
export type UsageRequest = {
	requestId: string;
	featureKey: string;
	runId: string;
	conversationId: string;
	userId: number | null;
	connectionId: number;
};

/** The columns every agent usage row shares, whatever its status. */
const requestColumns = (request: UsageRequest) => ({
	request_id: request.requestId,
	feature_key: request.featureKey,
	feature_version: "v1",
	user_id: request.userId,
	lucid_remote_connection_id: request.connectionId,
	agent_run_id: request.runId,
	session_type: "agent" as const,
	session_id: request.conversationId,
});

/** Persist the request identity before the remote service can incur usage. */
export const storePendingUsage: ServiceFn<[UsageRequest], undefined> = async (
	context,
	input,
) => {
	const AiGenerations = new AiGenerationsRepository(context.db);

	const result = await AiGenerations.createIfRequestAbsent({
		data: { ...requestColumns(input), status: "pending" },
	});
	if (result.error) return result;

	return { error: undefined, data: undefined };
};

/** Settles a request the Lucid service never charged, keeping why it failed. */
export const storeFailedUsage: ServiceFn<
	[UsageRequest & { errorMessage: string }],
	undefined
> = async (context, input) => {
	const AiGenerations = new AiGenerationsRepository(context.db);

	const result = await AiGenerations.upsertAgentUsage({
		data: {
			...requestColumns(input),
			status: "failed",
			error_message: input.errorMessage,
		},
	});
	if (result.error) return result;

	return { error: undefined, data: undefined };
};

/** Records what a request was charged. A settled request keeps its first usage. */
const storeUsage: ServiceFn<
	[
		UsageRequest & {
			usage: z.infer<typeof cmsAgentUsageSchema>;
			durationMs: number | null;
		},
	],
	undefined
> = async (context, input) => {
	const AiGenerations = new AiGenerationsRepository(context.db);

	const result = await AiGenerations.upsertAgentUsage({
		data: {
			...requestColumns(input),
			provider_request_id: input.usage.providerRequestId ?? null,
			usage: input.usage,
			model: input.usage.model,
			credits: Number(input.usage.cost.creditsCharged),
			//* web requests are counted, not measured in tokens
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
