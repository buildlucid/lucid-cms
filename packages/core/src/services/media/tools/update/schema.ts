import z from "zod";
import { mediaItemSchema } from "../helpers/schema.js";

const translation = (max: number, description: string) =>
	z
		.string()
		.trim()
		.min(1)
		.max(max)
		.nullable()
		.optional()
		.meta({ description: `${description} Pass null to clear it.` });

const changeKeys = [
	"title",
	"alt",
	"description",
	"summary",
	"fileName",
	"folderId",
] as const;

export const inputSchema = z
	.object({
		mediaId: z.number().int().positive().meta({
			description: "Media ID, eg. from media_find or media_get.",
		}),
		contentLocale: z.string().trim().min(1).optional().meta({
			description:
				"Content language for title, alt, description and summary; defaults to the CMS content language.",
		}),
		title: translation(255, "Title for any media type."),
		alt: translation(1000, "Alt text, for images only."),
		description: translation(5000, "Description, for video and audio only."),
		summary: translation(5000, "Summary, for documents only."),
		fileName: z.string().trim().min(1).max(255).optional().meta({
			description:
				"File name used in the library and for downloads, eg. 'team-photo.jpg'. Keep the extension.",
		}),
		folderId: z.number().int().positive().nullable().optional().meta({
			description:
				"Media library folder ID; null moves it to the top level. Personal media can't go in folders.",
		}),
	})
	.strict()
	.refine((input) => changeKeys.some((key) => input[key] !== undefined), {
		message: "Include at least one change.",
	});

export const outputSchema = z.object({
	data: mediaItemSchema,
	meta: z
		.object({
			contentLocale: z
				.string()
				.nullable()
				.meta({ description: "Content language of the changes." }),
		})
		.meta({ description: "Media update context." }),
});
