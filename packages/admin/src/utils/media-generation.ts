import type { MediaGenerationModels, MediaGenerationType } from "@types";
import { Permissions } from "@/constants/permissions";
import T from "@/translations";

/** The media types Lucid can generate, in the order they're offered. */
export const mediaGenerationTypes = [
	"image",
	"audio",
] as const satisfies readonly MediaGenerationType[];

/** The permission each media type's generation needs. */
export const mediaGenerationPermissions = {
	image: Permissions.AiImageGenerate,
	audio: Permissions.AiAudioGenerate,
} as const satisfies Record<MediaGenerationType, string>;

const generatedFileTokens = {
	image: [
		"image/*",
		"image/webp",
		"image/png",
		"image/jpeg",
		".webp",
		".png",
		".jpg",
		".jpeg",
	],
	audio: ["audio/*", "audio/mpeg", ".mp3"],
} satisfies Record<MediaGenerationType, string[]>;

/** Returns media types allowed by `accept`, or all types when omitted. */
export const acceptedGenerationTypes = (
	accept?: string,
): MediaGenerationType[] => {
	if (!accept) return [...mediaGenerationTypes];

	const tokens = accept.split(",").map((token) => token.trim().toLowerCase());
	return mediaGenerationTypes.filter((type) =>
		tokens.some((token) => generatedFileTokens[type].includes(token)),
	);
};

const imageOptionLabels: Record<string, string> = {
	auto: "ai.media.image.generate.option.auto",
	"1:1": "ai.media.image.generate.aspect.ratio.option.square",
	"3:2": "ai.media.image.generate.aspect.ratio.option.landscape",
	"2:3": "ai.media.image.generate.aspect.ratio.option.portrait",
	"4:3": "ai.media.image.generate.aspect.ratio.option.standard",
	"3:4": "ai.media.image.generate.aspect.ratio.option.standard.portrait",
	"5:4": "ai.media.image.generate.aspect.ratio.option.print",
	"4:5": "ai.media.image.generate.aspect.ratio.option.social",
	"16:9": "ai.media.image.generate.aspect.ratio.option.wide",
	"9:16": "ai.media.image.generate.aspect.ratio.option.tall",
	"21:9": "ai.media.image.generate.aspect.ratio.option.ultrawide",
	low: "ai.media.image.generate.quality.option.low",
	medium: "ai.media.image.generate.quality.option.medium",
	high: "ai.media.image.generate.quality.option.high",
	webp: "ai.media.image.generate.format.option.webp",
	png: "ai.media.image.generate.format.option.png",
	jpeg: "ai.media.image.generate.format.option.jpeg",
};

/** Labels a model's image option, showing options Lucid adds later as they are. */
export const imageOptionLabel = (value: string) => {
	const label = imageOptionLabels[value];
	return label ? T()(label) : value;
};

/** A model's image option values as select options. */
export const imageSelectOptions = (values: string[]) =>
	values.map((value) => ({ value, label: imageOptionLabel(value) }));

export const imageGuidanceOptions = [
	{
		key: "natural",
		label: "ai.media.image.generate.guidance.option.natural",
		instruction: "ai.media.image.generate.guidance.instruction.natural",
	},
	{
		key: "lifestyle",
		label: "ai.media.image.generate.guidance.option.lifestyle",
		instruction: "ai.media.image.generate.guidance.instruction.lifestyle",
	},
	{
		key: "product",
		label: "ai.media.image.generate.guidance.option.product",
		instruction: "ai.media.image.generate.guidance.instruction.product",
	},
	{
		key: "illustration",
		label: "ai.media.image.generate.guidance.option.illustration",
		instruction: "ai.media.image.generate.guidance.instruction.illustration",
	},
	{
		key: "cinematic",
		label: "ai.media.image.generate.guidance.option.cinematic",
		instruction: "ai.media.image.generate.guidance.instruction.cinematic",
	},
] as const;

export type MediaImageGenerationGuidanceKey =
	(typeof imageGuidanceOptions)[number]["key"];

/** Image shape and output options, with null for settings chosen by the model. */
export type ImageOptions = {
	aspectRatio: string;
	resolution: string | null;
	quality: string | null;
	outputFormat: string | null;
};

type ImageModelOptions = Pick<
	MediaGenerationModels["image"],
	"aspectRatios" | "resolutions" | "qualities" | "outputFormats"
>;

const preferredImageOptions = {
	aspectRatio: "1:1",
	resolution: "1K",
	quality: "auto",
	outputFormat: "webp",
} satisfies Record<keyof ImageOptions, string>;

const fitOption = (
	options: string[],
	current: string | null | undefined,
	preferred: string,
) => {
	if (current && options.includes(current)) return current;
	return options.includes(preferred) ? preferred : (options[0] ?? null);
};

/**
 * Keeps supported image options, otherwise choosing the preferred or first available value.
 * @remarks Unsupported output options become null; an empty aspect-ratio list uses `auto`.
 */
export const fitImageOptions = (
	model: ImageModelOptions,
	current: Partial<ImageOptions>,
): ImageOptions => ({
	aspectRatio:
		fitOption(
			model.aspectRatios,
			current.aspectRatio,
			preferredImageOptions.aspectRatio,
		) ?? "auto",
	resolution: fitOption(
		model.resolutions,
		current.resolution,
		preferredImageOptions.resolution,
	),
	quality: fitOption(
		model.qualities,
		current.quality,
		preferredImageOptions.quality,
	),
	outputFormat: fitOption(
		model.outputFormats,
		current.outputFormat,
		preferredImageOptions.outputFormat,
	),
});

/** The resolution, quality and format selects for a model, leaving out the ones it doesn't take. */
export const imageOptionSelects = (model: ImageModelOptions) =>
	(
		[
			{
				key: "resolution",
				label: T()("ai.media.image.generate.resolution.label"),
				options: imageSelectOptions(model.resolutions),
			},
			{
				key: "quality",
				label: T()("ai.media.image.generate.quality.label"),
				options: imageSelectOptions(model.qualities),
			},
			{
				key: "outputFormat",
				label: T()("ai.media.image.generate.format.label"),
				options: imageSelectOptions(model.outputFormats),
			},
		] as const
	).filter((select) => select.options.length > 0);
