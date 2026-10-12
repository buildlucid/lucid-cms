import type { MediaGenerateResponse } from "@lucidcms/types";
import { mediaGenerations } from "../../../libs/config/ai-features.js";
import { copy } from "../../../libs/i18n/index.js";
import type {
	MediaAudioGenerateV1Request,
	MediaImageGenerateV1Request,
} from "../../../libs/lucid-remote/services/generate-cms-ai/type.js";
import { generateCmsAi } from "../../../libs/lucid-remote/services/index.js";
import {
	isCmsAiGenerateAcceptedData,
	isCmsAiGenerateCompletedData,
} from "../../../libs/lucid-remote/utils.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import handleRemoteError from "../../connection/helpers/handle-remote-error.js";
import getAccessToken from "../../connection/token-manager.js";
import storeGeneration from "../storage/store-generation.js";
import storePendingGeneration from "../storage/store-pending-generation.js";

/**
 * Starts and records a generation for polling, reporting even immediate results as processing.
 * @remarks Callers must first check that the media type's AI feature is enabled.
 */
const startMediaGeneration: ServiceFn<
	[
		{
			request: MediaImageGenerateV1Request | MediaAudioGenerateV1Request;
			/** What the generation was for, kept for inspecting a record. */
			target: Record<string, unknown>;
			idempotencyKey?: string;
			userId: number;
		},
	],
	MediaGenerateResponse
> = async (context, props) => {
	const requestStartedAt = Date.now();
	const accessTokenRes = await getAccessToken(context, {});
	if (accessTokenRes.error) return accessTokenRes;

	const idempotencyKey = props.idempotencyKey?.trim();
	if (!idempotencyKey) {
		return {
			error: {
				type: "basic",
				status: 400,
				message: copy("server:core.ai.media.generate.idempotency.key.required"),
			},
			data: undefined,
		};
	}

	const generateRes = await generateCmsAi(context, {
		accessToken: accessTokenRes.data.accessToken,
		actor: { type: "user", id: props.userId },
		request: props.request,
		idempotencyKey,
	});
	if (generateRes.error) {
		await handleRemoteError(context, generateRes.error);
		return generateRes;
	}
	const responseData = generateRes.data.json.data;
	const generation = mediaGenerations[props.request.feature.key];
	const session = {
		type: `media-${generation.type}`,
		id: props.request.sessionId,
	} as const;

	if (isCmsAiGenerateAcceptedData(responseData)) {
		const storeRes = await storePendingGeneration(context, {
			lucidRemoteConnectionId: accessTokenRes.data.lucidRemoteConnectionId,
			userId: props.userId,
			requestId: responseData.requestId,
			feature: generation.feature,
			session,
			target: props.target,
		});
		if (storeRes.error) return storeRes;

		return {
			error: undefined,
			data: {
				mode: "async",
				requestId: responseData.requestId,
				...generation,
				status: responseData.status,
			},
		};
	}

	if (!isCmsAiGenerateCompletedData(responseData)) {
		return {
			error: {
				type: "basic",
				status: 502,
				message: copy("server:core.routes.ai.generate.error.message"),
			},
			data: undefined,
		};
	}

	const storeRes = await storeGeneration(context, {
		lucidRemoteConnectionId: accessTokenRes.data.lucidRemoteConnectionId,
		userId: props.userId,
		response: responseData,
		session,
		requestStartedAt,
		target: props.target,
	});
	if (storeRes.error) return storeRes;

	return {
		error: undefined,
		data: {
			mode: "async",
			requestId: responseData.requestId,
			...generation,
			status: "processing",
		},
	};
};

export default startMediaGeneration;
