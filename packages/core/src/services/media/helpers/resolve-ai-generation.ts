import { copy } from "../../../libs/i18n/index.js";
import { AiGenerationsRepository } from "../../../libs/repositories/index.js";
import type { MediaOrigin } from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";

const resolveAiGeneration: ServiceFn<
	[
		{
			origin?: MediaOrigin;
			aiGenerationRequestId?: string;
		},
	],
	number | null | undefined
> = async (context, data) => {
	if (data.origin === undefined) {
		if (data.aiGenerationRequestId === undefined) {
			return {
				error: undefined,
				data: undefined,
			};
		}

		return {
			error: {
				type: "basic",
				status: 400,
				errors: {
					origin: {
						code: "media_error",
						message: copy(
							"server:core.media.errors.ai.generation.origin.required",
						),
					},
				},
			},
			data: undefined,
		};
	}

	if (data.origin === "human") {
		if (data.aiGenerationRequestId === undefined) {
			return {
				error: undefined,
				data: null,
			};
		}

		return {
			error: {
				type: "basic",
				status: 400,
				errors: {
					aiGenerationRequestId: {
						code: "media_error",
						message: copy("server:core.media.errors.ai.generation.human"),
					},
				},
			},
			data: undefined,
		};
	}

	if (data.aiGenerationRequestId === undefined) {
		return {
			error: undefined,
			data: null,
		};
	}

	const AiGenerations = new AiGenerationsRepository(
		context.db.client,
		context.config.db,
	);
	const aiGenerationRes = await AiGenerations.selectSingleByRequestId({
		requestId: data.aiGenerationRequestId,
		select: ["id", "feature_key", "status"],
		tenantKey: context.request.tenantKey,
	});
	if (aiGenerationRes.error) return aiGenerationRes;
	if (
		aiGenerationRes.data === undefined ||
		aiGenerationRes.data.feature_key !== "media.image.generate" ||
		aiGenerationRes.data.status !== "success"
	) {
		return {
			error: {
				type: "basic",
				status: 400,
				errors: {
					aiGenerationRequestId: {
						code: "media_error",
						message: copy("server:core.media.errors.ai.generation.not.found"),
					},
				},
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: aiGenerationRes.data.id,
	};
};

export default resolveAiGeneration;
