import z from "zod";
import {
	paginationInput,
	paginationSchema,
} from "../../../../libs/tools/pagination.js";

export const inputSchema = z.object(paginationInput);

export const localeSchema = z.object({
	purpose: z
		.enum(["content", "interface"])
		.meta({ description: "Content or CMS interface language." }),
	code: z.string().meta({ description: "Language code." }),
	name: z.string().meta({ description: "Human-readable language name." }),
	direction: z.enum(["ltr", "rtl"]).meta({ description: "Text direction." }),
	isDefault: z.boolean().meta({
		description: "Whether this language is the default for its purpose.",
	}),
});

export const outputSchema = z.object({
	data: z
		.array(localeSchema)
		.meta({ description: "Available languages for this page." }),
	pagination: paginationSchema,
	meta: z
		.object({
			content: z
				.object({
					defaultLocale: z.string().nullable(),
					availableCount: z.number(),
				})
				.meta({ description: "Content-language defaults and count." }),
			interface: z
				.object({
					defaultLocale: z.string(),
					currentLocale: z.string(),
					availableCount: z.number(),
				})
				.meta({ description: "CMS interface-language defaults and count." }),
		})
		.meta({ description: "Language catalog context." }),
});
