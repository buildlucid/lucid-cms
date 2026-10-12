import z from "zod";
import { mediaGenerationFeatures } from "../../../libs/config/ai-features.js";
import { cmsAiMediaOutputSchemas } from "../../../libs/lucid-remote/schema/ai.js";
import generatedMediaUrl from "./generated-media-url.js";

//* Lucid's URL needs its access token, so admin previews go through the CMS
const withProxyUrl = <Output extends { storageKey: string }>(
	output: Output,
) => ({
	...output,
	url: generatedMediaUrl(output.storageKey),
});

/** Parses `{ type, output }`, adding a CMS preview URL and the corresponding Lucid feature. */
export const mediaOutputSchema = z.union([
	z
		.object({
			type: z.literal("image"),
			output: cmsAiMediaOutputSchemas.image.transform(withProxyUrl),
		})
		.transform((media) => ({
			...media,
			feature: mediaGenerationFeatures.image.feature,
		})),
	z
		.object({
			type: z.literal("audio"),
			output: cmsAiMediaOutputSchemas.audio.transform(withProxyUrl),
		})
		.transform((media) => ({
			...media,
			feature: mediaGenerationFeatures.audio.feature,
		})),
]);
