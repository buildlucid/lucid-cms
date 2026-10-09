import z from "zod";
import { mediaItemSchema } from "../helpers/schema.js";

export const inputSchema = z.object({
	mediaId: z.number().int().positive().meta({
		description: "Media ID, eg. from media_find.",
	}),
	contentLocale: z.string().trim().min(1).optional().meta({
		description:
			"Content language for title, alt text and descriptions; defaults to the CMS content language.",
	}),
});

export const outputSchema = z.object({
	data: mediaItemSchema,
	meta: z
		.object({
			contentLocale: z
				.string()
				.nullable()
				.meta({ description: "Selected content language." }),
		})
		.meta({ description: "Media read context." }),
});
