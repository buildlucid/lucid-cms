import z from "zod";
import {
	mediaImageAspectRatioSchema,
	mediaImageOptionSchema,
} from "../../../../schemas/ai.js";
import type {
	AgentImageSettings,
	AgentImageSettingsData,
} from "../../../../types/response.js";
import { imageGuidanceSchema } from "../../../ai/helpers/image-guidance.js";

/** Images the generation model accepts to edit. */
export const editableImageMimeTypeSchema = z.enum([
	"image/webp",
	"image/png",
	"image/jpeg",
]);

/** Shared input for image generation and editing. */
export const inputSchema = z
	.object({
		instruction: z.string().trim().min(1).max(8_000).meta({
			description:
				"What to create, in detail: subject, setting, composition, lighting and mood, plus any text to include.",
		}),
		guidance: imageGuidanceSchema.optional().meta({
			description:
				"A style preset applied with the instruction. Leave it out when the instruction already sets the style.",
		}),
		aspectRatio: mediaImageAspectRatioSchema.default("1:1").meta({
			description:
				"The image's shape as width:height, such as 16:9 for a wide banner or 9:16 for a tall one. auto lets the model choose. Models without it use their own default.",
		}),
		resolution: mediaImageOptionSchema.optional().meta({
			description:
				"Such as 1K, 2K or 4K. Leave it out unless asked for a larger image. Models without it pick their own.",
		}),
		title: z.string().trim().min(1).max(255).meta({
			description: "A short title for the saved media, in the CMS language.",
		}),
		alt: z.string().trim().min(1).max(1_000).optional().meta({
			description:
				"Alt text describing the image for people who can't see it. Defaults to the title.",
		}),
		library: z.boolean().default(false).meta({
			description:
				"Save the image to the media library as public media, ready to use in documents, instead of the person's private personal media. Set it when the image is for a document or field.",
		}),
		skipReview: z.boolean().default(false).meta({
			description:
				"In chats the person checks and can adjust the instruction, style, model, shape and quality before generating. Only skip that when they already gave the settings or asked you to go ahead without checking. Routines never ask.",
		}),
	})
	.strict();

/** Reviewed settings returned by the image widget. */
export const settingsResponseSchema = z
	.object({
		instruction: inputSchema.shape.instruction,
		title: inputSchema.shape.title,
		alt: z.string().trim().min(1).max(1_000).nullable(),
		guidance: imageGuidanceSchema.nullable(),
		aspectRatio: mediaImageAspectRatioSchema,
		resolution: mediaImageOptionSchema.nullable(),
		quality: mediaImageOptionSchema.nullable(),
		outputFormat: mediaImageOptionSchema.nullable(),
		model: z.string().trim().min(1).max(200).nullable(),
	})
	.strict() satisfies z.ZodType<AgentImageSettings>;

/** Saved settings and optional source image for the review widget. */
export const settingsDataSchema = settingsResponseSchema.extend({
	editMediaId: z.number().int().positive().nullable(),
}) satisfies z.ZodType<AgentImageSettingsData>;

export { generatedMediaOutputSchema as outputSchema } from "../../helpers/generated-media-schema.js";
