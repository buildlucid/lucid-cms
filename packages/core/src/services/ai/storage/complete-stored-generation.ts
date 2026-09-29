import type { CmsAiGenerateCompletedData } from "../../../libs/lucid-remote/services/generate-cms-ai/type.js";
import { AiGenerationsRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import { parseStoredTimestamp } from "../helpers/date-helpers.js";
import getRequestDurationMs from "../helpers/get-request-duration-ms.js";

const completeStoredGeneration: ServiceFn<
	[
		{
			response: CmsAiGenerateCompletedData;
		},
	],
	undefined
> = async (context, props) => {
	const AiGenerations = new AiGenerationsRepository(context.db);

	const existingRes = await AiGenerations.selectSingleByRequestId({
		requestId: props.response.requestId,
		select: ["id", "created_at"],
	});
	if (existingRes.error) return existingRes;

	if (!existingRes.data) {
		return {
			error: undefined,
			data: undefined,
		};
	}

	const createdAt = parseStoredTimestamp(existingRes.data.created_at);
	const durationMs = Number.isNaN(createdAt.getTime())
		? null
		: getRequestDurationMs(createdAt.getTime());

	const updateRes = await AiGenerations.updateSingle({
		data: {
			output: props.response.output as Record<string, unknown>,
			provider_request_id: props.response.usage.providerRequestId ?? null,
			usage: props.response.usage,
			model: props.response.usage.model,
			credits: Number(props.response.usage.cost.creditsCharged),
			input_tokens: props.response.usage.tokens.input.total,
			output_tokens: props.response.usage.tokens.output.total,
			total_tokens: props.response.usage.tokens.total,
			duration_ms: durationMs,
			status: "success",
			error_message: null,
		},
		where: [
			{
				key: "request_id",
				operator: "=",
				value: props.response.requestId,
			},
		],
		returning: ["id"],
	});
	if (updateRes.error) return updateRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default completeStoredGeneration;
