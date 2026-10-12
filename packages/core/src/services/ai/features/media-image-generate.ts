import type { MediaGenerateResponse } from "@lucidcms/types";
import { copy } from "../../../libs/i18n/index.js";
import type { MediaImageGenerateV1Request } from "../../../libs/lucid-remote/services/generate-cms-ai/type.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import checkFeatureEnabled from "../checks/check-feature-enabled.js";
import {
	imageGuidanceInstructions,
	imageGuidanceSchema,
} from "../helpers/image-guidance.js";
import resolveMediaModel from "../helpers/resolve-media-model.js";
import startMediaGeneration from "../helpers/start-media-generation.js";

/** Generates or edits an image for the admin from an instruction, with an optional style preset and source image. */
const mediaImageGenerate: ServiceFn<
	[
		{
			sessionId?: string;
			instruction: string;
			guidance?: string;
			image?: Extract<
				MediaImageGenerateV1Request["input"][number],
				{ type: "image" }
			>["image"];
			previousInstructions?: string[];
			generation: MediaImageGenerateV1Request["generation"];
			idempotencyKey?: string;
			userId: number;
		},
	],
	MediaGenerateResponse
> = async (context, props) => {
	const featureEnabledRes = await checkFeatureEnabled(context, {
		feature: "imageGeneration",
	});
	if (featureEnabledRes.error) return featureEnabledRes;

	const instruction = props.instruction.trim();
	const guidanceKey = imageGuidanceSchema.safeParse(props.guidance);
	const guidance = guidanceKey.success
		? imageGuidanceInstructions[guidanceKey.data]
		: undefined;

	if (props.guidance && !guidance) {
		return {
			error: {
				type: "basic",
				status: 400,
				message: copy("server:core.ai.guidance.not.found"),
			},
			data: undefined,
		};
	}

	if (!instruction) {
		return {
			error: {
				type: "basic",
				status: 400,
				message: copy(
					"server:core.ai.media.image.generate.instruction.required",
				),
			},
			data: undefined,
		};
	}

	const model = await resolveMediaModel(context, {
		type: "image",
		modelId: props.generation.model,
	});
	if (model.error) return model;

	const input: MediaImageGenerateV1Request["input"] = [
		{ type: "text", role: "user-instruction", value: instruction },
	];
	if (guidance) {
		input.push({
			type: "text",
			role: "guidance",
			value: guidance,
		});
	}
	if (props.image) {
		input.push({
			type: "image",
			role: "source-image",
			image: props.image,
		});
	}

	const generation = { ...props.generation, model: model.data };
	return startMediaGeneration(context, {
		request: {
			feature: { key: "media.image.generate", version: "v1" },
			sessionId: props.sessionId,
			input,
			context: {
				previousInstructions:
					props.previousInstructions && props.previousInstructions.length > 0
						? props.previousInstructions
						: undefined,
			},
			generation,
		},
		target: {
			generation,
			guidance: props.guidance ?? null,
			previousInstructions: props.previousInstructions ?? [],
			sourceImage: props.image
				? {
						type: props.image.type,
						detail: props.image.detail ?? null,
						filename: props.image.filename ?? null,
						mimeType: props.image.mimeType ?? null,
					}
				: null,
		},
		idempotencyKey: props.idempotencyKey,
		userId: props.userId,
	});
};

export default mediaImageGenerate;
