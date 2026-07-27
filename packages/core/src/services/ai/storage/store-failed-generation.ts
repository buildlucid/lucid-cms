import type { AiGenerateUsage } from "@lucidcms/types";
import type { CmsAiGenerateRequestFeature } from "../../../libs/lucid-remote/services/generate-cms-ai/type.js";
import { AiGenerationsRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import { parseStoredTimestamp } from "../helpers/date-helpers.js";
import getRequestDurationMs from "../helpers/get-request-duration-ms.js";

const storeFailedGeneration: ServiceFn<
	[
		{
			requestId: string;
			lucidRemoteConnectionId?: number;
			feature?: CmsAiGenerateRequestFeature;
			userId?: number;
			targetType?: string;
			target?: Record<string, unknown>;
			requestStartedAt?: number;
			errorMessage?: string | null;
			/** Authoritative usage from a completed remote response, if one exists. */
			usage?: AiGenerateUsage | null;
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
		select: ["id", "created_at", "status"],
		tenantKey: context.request.tenantKey,
	});
	if (existingRes.error) return existingRes;

	if (existingRes.data) {
		if (existingRes.data.status !== "pending") {
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
				...(props.usage
					? {
							provider_request_id: props.usage.providerRequestId ?? null,
							usage: props.usage,
							model: props.usage.model,
							credits_charged: props.usage.cost.creditsCharged,
						}
					: {}),
				duration_ms: durationMs,
				status: "failed",
				error_message: props.errorMessage ?? null,
			},
			where: [
				{
					key: "request_id",
					operator: "=",
					value: props.requestId,
				},
			],
			returning: ["id"],
		});
		if (updateRes.error) return updateRes;

		return {
			error: undefined,
			data: undefined,
		};
	}

	if (!props.feature || !props.targetType || !props.target) {
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
			user_id: props.userId ?? null,
			lucid_remote_connection_id: props.lucidRemoteConnectionId ?? null,
			target_type: props.targetType,
			target: props.target,
			output: null,
			usage: null,
			model: null,
			credits_charged: null,
			duration_ms:
				props.requestStartedAt === undefined
					? null
					: getRequestDurationMs(props.requestStartedAt),
			status: "failed",
			error_message: props.errorMessage ?? null,
			...(props.usage
				? {
						provider_request_id: props.usage.providerRequestId ?? null,
						usage: props.usage,
						model: props.usage.model,
						credits_charged: props.usage.cost.creditsCharged,
					}
				: {}),
		},
		returning: ["id"],
	});
	if (createRes.error) return createRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default storeFailedGeneration;
