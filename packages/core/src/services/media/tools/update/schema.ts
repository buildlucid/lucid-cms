import z from "zod";
import constants from "../../../../constants/constants.js";
import { mediaItemSchema } from "../helpers/schema.js";

const translation = (max: number, description: string) =>
	z.string().trim().min(1).max(max).optional().meta({ description });

/** Fields explicitly removed by `clear`, so omitted values remain unchanged. */
const clearableKeys = [
	"title",
	"alt",
	"description",
	"summary",
	"transcript",
	"folderId",
] as const;

export const inputSchema = z
	.object({
		mediaId: z.number().int().positive().meta({
			description: "Media ID, eg. from media_find or media_get.",
		}),
		contentLocale: z.string().trim().min(1).optional().meta({
			description:
				"Content language for title, alt, description, summary and transcript; defaults to the CMS content language.",
		}),
		title: translation(255, "Title for any media type."),
		alt: translation(1000, "Alt text, for images only."),
		description: translation(5000, "Description, for video and audio only."),
		summary: translation(5000, "Summary, for documents only."),
		transcript: translation(
			constants.media.transcriptMaxLength,
			"Transcript of the words spoken, for audio only.",
		),
		fileName: z.string().trim().min(1).max(255).optional().meta({
			description:
				"File name used in the library and for downloads, eg. 'team-photo.jpg'. Keep the extension.",
		}),
		folderId: z.number().int().positive().optional().meta({
			description:
				"Media library folder ID to move it to. Personal media can't go in folders.",
		}),
		clear: z.array(z.enum(clearableKeys)).optional().meta({
			description:
				"Fields to remove: text in contentLocale, or folderId to move it to the top level. Only list fields you were asked to remove.",
		}),
	})
	.strict()
	.refine(
		(input) =>
			clearableKeys.some((key) => input[key] !== undefined) ||
			input.fileName !== undefined ||
			(input.clear?.length ?? 0) > 0,
		{ message: "Include at least one change." },
	)
	.refine((input) => !input.clear?.some((key) => input[key] !== undefined), {
		message: "Don't set and clear the same field.",
	});

export const outputSchema = z.object({
	media: mediaItemSchema.meta({ description: "The media after the update." }),
	meta: z
		.object({
			contentLocale: z
				.string()
				.nullable()
				.meta({ description: "Content language of the changes." }),
		})
		.meta({ description: "Media update context." }),
});
