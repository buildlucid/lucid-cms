import type { CmsAiGenerateCompletedData } from "../../../libs/lucid-remote/services/generate-cms-ai.js";
import { AiGenerationsRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

const completeStoredGeneration: ServiceFn<
	[
		{
			response: CmsAiGenerateCompletedData;
		},
	],
	undefined
> = async (context, props) => {
	const AiGenerations = new AiGenerationsRepository(
		context.db.client,
		context.config.db,
	);

	const existingRes = await AiGenerations.selectSingle({
		select: ["created_at"],
		where: [
			{
				key: "request_id",
				operator: "=",
				value: props.response.requestId,
			},
		],
	});
	if (existingRes.error) return existingRes;

	if (!existingRes.data) {
		return {
			error: undefined,
			data: undefined,
		};
	}

	const createdAt = new Date(existingRes.data.created_at).getTime();
	const durationMs = Number.isFinite(createdAt)
		? Math.max(0, Date.now() - createdAt)
		: null;

	const updateRes = await AiGenerations.updateSingle({
		data: {
			provider_request_id: props.response.usage.providerRequestId ?? null,
			output: props.response.output as Record<string, unknown>,
			usage: props.response.usage,
			model: props.response.usage.model,
			cost_currency: props.response.usage.cost.currency,
			cost_total_minor: props.response.usage.cost.totalCostMinor,
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
