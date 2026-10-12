import type { MediaGenerateCompletionResponse } from "@types";
import T from "@/translations";
import helpers from "@/utils/helpers";
import { imageOptionLabel } from "@/utils/media-generation";
import type { MediaGenerationSettings } from "../types";

/** What a generation was asked for, shown above its details. */
export const generationSummary = (settings: MediaGenerationSettings) =>
	settings.type === "audio" ? settings.script : settings.instruction;

/** A generation's settings as detail rows, plus the file size once it has a result. */
export const generationDetails = (
	settings: MediaGenerationSettings,
	result?: MediaGenerateCompletionResponse,
) => {
	const model = {
		label: T()("ai.models.label"),
		value: settings.modelName,
		wrap: true,
	};
	const fileSize = result
		? [
				{
					label: T()("ai.media.generate.response.size"),
					value: helpers.bytesToSize(result.output.byteSize),
				},
			]
		: [];

	if (settings.type === "audio") {
		return [
			model,
			{
				label: T()("ai.media.audio.generate.voice.label"),
				value: settings.voiceName,
			},
			{
				label: T()("ai.media.audio.generate.characters"),
				value: String(settings.script.length),
			},
			...fileSize,
		];
	}

	return [
		model,
		{
			label: T()("ai.media.image.generate.source.label"),
			value: settings.sourceLabel,
			wrap: true,
		},
		{
			label: T()("ai.media.image.generate.aspect.ratio.label"),
			value: imageOptionLabel(settings.aspectRatio),
		},
		...(
			[
				["ai.media.image.generate.resolution.label", settings.resolution],
				["ai.media.image.generate.quality.label", settings.quality],
				["ai.media.image.generate.format.label", settings.outputFormat],
			] as const
		).flatMap(([label, value]) =>
			value ? [{ label: T()(label), value: imageOptionLabel(value) }] : [],
		),
		...fileSize,
	];
};
