import type { AiGenerateUsage } from "@lucidcms/types";
import type { CmsAiGenerateRequestFeature } from "../../../libs/lucid-remote/services/generate-cms-ai/type.js";
import { AiGenerationsRepository } from "../../../libs/repositories/index.js";
import type { AiUsageSessionType } from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import { parseStoredTimestamp } from "../helpers/date-helpers.js";
import getRequestDurationMs from "../helpers/get-request-duration-ms.js";

/**
 * Marks a pending generation as failed. Without a stored record, one is
 * created when the request details are given.
 */
const storeFailedGeneration: ServiceFn<
	[
		{
			requestId: string;
			lucidRemoteConnectionId?: number;
			feature?: CmsAiGenerateRequestFeature;
			userId?: number;
			session?: { type: AiUsageSessionType; id?: string };
			target?: Record<string, unknown>;
			requestStartedAt?: number;
			errorMessage?: string | null;
			/** Authoritative usage from a completed remote response, if one exists. */
			usage?: AiGenerateUsage | null;
		},
	],
	undefined
> = async (context, props) => {
	const AiGenerations = new AiGenerationsRepository(context.db);
	const reported = props.usage
		? {
				provider_request_id: props.usage.providerRequestId ?? null,
				usage: props.usage,
				model: props.usage.model,
				credits: Number(props.usage.cost.creditsCharged),
				input_tokens: props.usage.tokens.input.total,
				output_tokens: props.usage.tokens.output.total,
				total_tokens: props.usage.tokens.total,
			}
		: {};

	const existingRes = await AiGenerations.selectSingleByRequestId({
		requestId: props.requestId,
		select: ["id", "created_at", "status"],
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
				...reported,
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

	if (!props.feature || !props.session) {
		return {
			error: undefined,
			data: undefined,
		};
	}

	const createRes = await AiGenerations.createSingle({
		data: {
			request_id: props.requestId,
			feature_key: props.feature.key,
			feature_version: props.feature.version,
			user_id: props.userId ?? null,
			lucid_remote_connection_id: props.lucidRemoteConnectionId ?? null,
			session_type: props.session.type,
			session_id: props.session.id ?? props.requestId,
			target: props.target ?? null,
			...reported,
			duration_ms:
				props.requestStartedAt === undefined
					? null
					: getRequestDurationMs(props.requestStartedAt),
			status: "failed",
			error_message: props.errorMessage ?? null,
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
