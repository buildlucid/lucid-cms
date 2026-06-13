import { AiGenerationsRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

const storePendingGeneration: ServiceFn<
	[
		{
			userId: number;
			requestId: string;
			feature: {
				key: string;
				version: string;
			};
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

	const existingRes = await AiGenerations.selectSingleByRequestId({
		requestId: props.requestId,
		select: ["id"],
		tenantKey: context.request.tenantKey,
	});
	if (existingRes.error) return existingRes;

	if (existingRes.data) {
		return {
			error: undefined,
			data: undefined,
		};
	}

	const createRes = await AiGenerations.createSingle({
		data: {
			request_id: props.requestId,
			provider_request_id: null,
			feature_key: props.feature.key,
			feature_version: props.feature.version,
			tenant_key: context.request.tenantKey ?? null,
			user_id: props.userId,
			target_type: props.targetType,
			target: props.target,
			output: null,
			usage: null,
			model: null,
			cost_currency: null,
			cost_total_minor: null,
			duration_ms: null,
			status: "pending",
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

export default storePendingGeneration;
