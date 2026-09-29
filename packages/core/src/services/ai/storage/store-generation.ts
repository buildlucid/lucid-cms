import type { AiGenerationStatus } from "../../../libs/db/tables/index.js";
import type { CmsAiGenerateCompletedData } from "../../../libs/lucid-remote/services/generate-cms-ai/type.js";
import { AiGenerationsRepository } from "../../../libs/repositories/index.js";
import type { AiUsageSessionType } from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import getRequestDurationMs from "../helpers/get-request-duration-ms.js";

const storeGeneration: ServiceFn<
	[
		{
			lucidRemoteConnectionId: number;
			userId: number | null;
			/** Without an id, the request is its own session. */
			session: { type: AiUsageSessionType; id?: string };
			response: CmsAiGenerateCompletedData;
			/** What the generation was for, kept for inspecting a record. */
			target?: Record<string, unknown>;
			requestStartedAt: number;
			status?: AiGenerationStatus;
			errorMessage?: string | null;
		},
	],
	undefined
> = async (context, props) => {
	const AiGenerations = new AiGenerationsRepository(context.db);

	const createRes = await AiGenerations.createIfRequestAbsent({
		data: {
			request_id: props.response.requestId,
			feature_key: props.response.feature.key,
			feature_version: props.response.feature.version,
			user_id: props.userId,
			lucid_remote_connection_id: props.lucidRemoteConnectionId,
			session_type: props.session.type,
			session_id: props.session.id ?? props.response.requestId,
			target: props.target ?? null,
			output: props.response.output as Record<string, unknown>,
			provider_request_id: props.response.usage.providerRequestId ?? null,
			usage: props.response.usage,
			model: props.response.usage.model,
			credits: Number(props.response.usage.cost.creditsCharged),
			input_tokens: props.response.usage.tokens.input.total,
			output_tokens: props.response.usage.tokens.output.total,
			total_tokens: props.response.usage.tokens.total,
			duration_ms: getRequestDurationMs(props.requestStartedAt),
			status: props.status ?? "success",
			error_message: props.errorMessage ?? null,
		},
	});
	if (createRes.error) return createRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default storeGeneration;
