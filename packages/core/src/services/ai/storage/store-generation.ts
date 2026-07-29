import type { AiGenerationStatus } from "../../../libs/db/types.js";
import type { CmsAiGenerateCompletedData } from "../../../libs/lucid-remote/services/generate-cms-ai/type.js";
import { AiGenerationsRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import getRequestDurationMs from "../helpers/get-request-duration-ms.js";

const storeGeneration: ServiceFn<
	[
		{
			lucidRemoteConnectionId: number;
			userId: number;
			response: CmsAiGenerateCompletedData;
			targetType: string;
			target: Record<string, unknown>;
			requestStartedAt: number;
			status?: AiGenerationStatus;
			errorMessage?: string | null;
		},
	],
	undefined
> = async (context, props) => {
	const AiGenerations = new AiGenerationsRepository(
		context.db.client,
		context.config.db,
	);

	const createRes = await AiGenerations.createIfRequestAbsent({
		data: {
			request_id: props.response.requestId,
			provider_request_id: props.response.usage.providerRequestId ?? null,
			feature_key: props.response.feature.key,
			feature_version: props.response.feature.version,
			user_id: props.userId,
			lucid_remote_connection_id: props.lucidRemoteConnectionId,
			target_type: props.targetType,
			target: props.target,
			output: props.response.output as Record<string, unknown>,
			usage: props.response.usage,
			model: props.response.usage.model,
			credits_charged: props.response.usage.cost.creditsCharged,
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
