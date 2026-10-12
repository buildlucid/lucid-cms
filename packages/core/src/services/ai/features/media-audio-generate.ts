import type { MediaGenerateResponse } from "@lucidcms/types";
import type { MediaAudioGenerateV1Request } from "../../../libs/lucid-remote/services/generate-cms-ai/type.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import checkFeatureEnabled from "../checks/check-feature-enabled.js";
import resolveMediaModel from "../helpers/resolve-media-model.js";
import startMediaGeneration from "../helpers/start-media-generation.js";

/** Speaks a script for the admin, with delivery instructions for models that take them. */
const mediaAudioGenerate: ServiceFn<
	[
		{
			sessionId?: string;
			script: string;
			instruction?: string;
			generation: MediaAudioGenerateV1Request["generation"];
			idempotencyKey?: string;
			userId: number;
		},
	],
	MediaGenerateResponse
> = async (context, props) => {
	const featureEnabledRes = await checkFeatureEnabled(context, {
		feature: "audioGeneration",
	});
	if (featureEnabledRes.error) return featureEnabledRes;

	const model = await resolveMediaModel(context, {
		type: "audio",
		modelId: props.generation.model,
	});
	if (model.error) return model;

	const instruction = props.instruction?.trim();
	const input: MediaAudioGenerateV1Request["input"] = [
		{ type: "text", role: "script", value: props.script },
	];
	if (instruction) {
		input.push({
			type: "text",
			role: "user-instruction",
			value: instruction,
		});
	}

	const generation = { ...props.generation, model: model.data };
	return startMediaGeneration(context, {
		request: {
			feature: { key: "media.audio.generate", version: "v1" },
			sessionId: props.sessionId,
			input,
			generation,
		},
		target: {
			generation,
			characters: props.script.length,
			instruction: instruction ?? null,
		},
		idempotencyKey: props.idempotencyKey,
		userId: props.userId,
	});
};

export default mediaAudioGenerate;
