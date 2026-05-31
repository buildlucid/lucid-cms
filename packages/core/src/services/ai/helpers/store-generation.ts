import type { CmsAiGenerateData } from "../../../libs/lucid-remote/services/generate-cms-ai.js";
import { AiGenerationsRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

const storeGeneration: ServiceFn<
	[
		{
			userId: number;
			response: CmsAiGenerateData;
			targetType: string;
			target: Record<string, unknown>;
		},
	],
	undefined
> = async (context, props) => {
	const AiGenerations = new AiGenerationsRepository(
		context.db.client,
		context.config.db,
	);
	const output =
		typeof props.response.output === "object" && props.response.output !== null
			? (props.response.output as Record<string, unknown>)
			: { value: props.response.output };

	const createRes = await AiGenerations.createSingle({
		data: {
			request_id: props.response.requestId,
			provider_request_id: props.response.usage.providerRequestId ?? null,
			feature_key: props.response.feature.key,
			feature_version: props.response.feature.version,
			user_id: props.userId,
			target_type: props.targetType,
			target: props.target,
			output,
			usage: props.response.usage,
			model: props.response.usage.model,
			cost_currency: props.response.usage.cost.currency,
			cost_total_minor: props.response.usage.cost.totalCostMinor,
			status: "success",
			error_message: null,
		},
		returning: ["id"],
	});
	if (createRes.error) return createRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default storeGeneration;
