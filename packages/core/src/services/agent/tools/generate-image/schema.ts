import z from "zod";
import {
	mediaImageOutputFormatSchema,
	mediaImageQualitySchema,
	mediaImageSizePresetSchema,
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
		size: mediaImageSizePresetSchema.default("1024x1024").meta({
			description:
				"Output resolution, width by height. auto lets the model choose.",
		}),
		quality: mediaImageQualitySchema.default("medium"),
		outputFormat: mediaImageOutputFormatSchema.default("webp"),
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
				"In chats the person checks and can adjust the instruction, style, size and quality before generating. Only skip that when they already gave the settings or asked you to go ahead without checking. Routines never ask.",
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
		size: mediaImageSizePresetSchema,
		quality: mediaImageQualitySchema,
		outputFormat: mediaImageOutputFormatSchema,
	})
	.strict() satisfies z.ZodType<AgentImageSettings>;

/** Saved settings and optional source image for the review widget. */
export const settingsDataSchema = settingsResponseSchema.extend({
	editMediaId: z.number().int().positive().nullable(),
}) satisfies z.ZodType<AgentImageSettingsData>;

export const outputSchema = z.object({
	media: z.object({
		id: z.number().meta({ description: "The saved media's ID." }),
		fileName: z.string(),
		mimeType: z.string(),
		personal: z.boolean().meta({
			description:
				"Whether the media is personal to the person, rather than in the media library.",
		}),
	}),
	requestId: z.string().meta({ description: "The Lucid AI request ID." }),
	note: z.string(),
});
