import type {
	MediaGenerateCompletionPollResponse,
	MediaGenerateCompletionResponse,
} from "@lucidcms/types";
import {
	mediaGenerationFeatures,
	mediaGenerationOf,
} from "../../../libs/config/ai-features.js";
import { copy } from "../../../libs/i18n/index.js";
import { getCmsAiRequest } from "../../../libs/lucid-remote/services/index.js";
import {
	isCmsAiGenerateAcceptedData,
	isCmsAiGenerateCompletedData,
} from "../../../libs/lucid-remote/utils.js";
import hasAccess from "../../../libs/permission/has-access.js";
import { AiGenerationsRepository } from "../../../libs/repositories/index.js";
import type { LucidUser } from "../../../types/hono.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import handleProtectedResourceUnauthorized from "../../connection/helpers/handle-protected-resource-unauthorized.js";
import getAccessToken from "../../connection/token-manager.js";
import checkFeatureEnabled from "../checks/check-feature-enabled.js";
import { mediaOutputSchema } from "../helpers/media-output.js";
import completeStoredGeneration from "../storage/complete-stored-generation.js";
import storeFailedGeneration from "../storage/store-failed-generation.js";

/**
 * Polls a media generation and records its completed result.
 * @remarks Requires the media type's generation permission.
 */
const mediaCompletion: ServiceFn<
	[
		{
			requestId: string;
			user: LucidUser;
		},
	],
	MediaGenerateCompletionPollResponse
> = async (context, props) => {
	const AiGenerations = new AiGenerationsRepository(context.db);
	const storedGenerationRes = await AiGenerations.selectSingleByRequestId({
		requestId: props.requestId,
		select: ["id", "feature_key"],
	});
	if (storedGenerationRes.error) return storedGenerationRes;

	const generation = storedGenerationRes.data
		? mediaGenerationOf(storedGenerationRes.data.feature_key)
		: undefined;
	if (!generation) {
		return {
			error: {
				type: "basic",
				status: 404,
				message: copy("server:core.ai.generation.request.not.found"),
			},
			data: undefined,
		};
	}

	const { type, feature } = generation;
	if (
		!hasAccess({
			user: props.user,
			requiredPermissions: [mediaGenerationFeatures[type].permission],
		})
	) {
		return {
			error: {
				type: "basic",
				status: 403,
				name: copy("server:core.permissions.error.name"),
				message: copy("server:core.permissions.denied"),
			},
			data: undefined,
		};
	}

	const featureEnabledRes = await checkFeatureEnabled(context, {
		feature: `${type}Generation`,
	});
	if (featureEnabledRes.error) return featureEnabledRes;

	const accessTokenRes = await getAccessToken(context, {});
	if (accessTokenRes.error) return accessTokenRes;

	const requestRes = await getCmsAiRequest(context, {
		accessToken: accessTokenRes.data.accessToken,
		requestId: props.requestId,
		feature,
	});
	if (requestRes.error) {
		if (requestRes.error.status === 401) {
			await handleProtectedResourceUnauthorized(context);
		}
		if (
			requestRes.error.key?.startsWith("ai_provider_") ||
			requestRes.error.key === "cms_ai_generation_request_not_found" ||
			requestRes.error.key === "cms_ai_generated_media_not_found" ||
			requestRes.error.key === "cms_ai_generation_option_not_supported" ||
			requestRes.error.key === "cms_ai_model_unavailable"
		) {
			const storeRes = await storeFailedGeneration(context, {
				requestId: props.requestId,
				errorMessage: context.translate(requestRes.error.message) ?? null,
			});
			if (storeRes.error) return storeRes;
		}

		return requestRes;
	}

	const data = requestRes.data.json.data;
	if (isCmsAiGenerateAcceptedData(data)) {
		return {
			error: undefined,
			data: {
				mode: data.mode,
				requestId: data.requestId,
				...generation,
				status: data.status,
			},
		};
	}

	const media = isCmsAiGenerateCompletedData(data)
		? mediaOutputSchema.safeParse({ type, output: data.output })
		: undefined;
	if (!isCmsAiGenerateCompletedData(data) || !media?.success) {
		const storeRes = await storeFailedGeneration(context, {
			requestId: props.requestId,
			errorMessage: context.translate(
				"server:core.routes.ai.generate.error.message",
			),
			usage: isCmsAiGenerateCompletedData(data) ? data.usage : undefined,
		});
		if (storeRes.error) return storeRes;

		return {
			error: {
				type: "basic",
				status: 502,
				message: copy("server:core.routes.ai.generate.error.message"),
			},
			data: undefined,
		};
	}

	const response: MediaGenerateCompletionResponse = {
		mode: data.mode,
		status: data.status,
		requestId: data.requestId,
		usage: data.usage,
		...media.data,
	};

	const storeRes = await completeStoredGeneration(context, {
		response,
	});
	if (storeRes.error) return storeRes;

	return {
		error: undefined,
		data: response,
	};
};

export default mediaCompletion;
