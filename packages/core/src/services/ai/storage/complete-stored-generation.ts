import type { CmsAiGenerateCompletedData } from "../../../libs/lucid-remote/schema/ai.js";
import { AiGenerationsRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import getRequestDurationMs from "../helpers/get-request-duration-ms.js";

/** Records completed output and usage for a stored generation, ignoring unknown requests. */
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

	const updateRes = await AiGenerations.updateSingle({
		data: {
			output: props.response.output,
			provider_request_id: props.response.usage.providerRequestId ?? null,
			usage: props.response.usage,
			model: props.response.usage.model,
			credits: Number(props.response.usage.cost.creditsCharged),
			input_tokens: props.response.usage.tokens.input.total,
			output_tokens: props.response.usage.tokens.output.total,
			total_tokens: props.response.usage.tokens.total,
			duration_ms: getRequestDurationMs(existingRes.data.created_at),
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
