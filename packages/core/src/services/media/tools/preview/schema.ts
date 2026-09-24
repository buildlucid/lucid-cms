import z from "zod";

export const inputSchema = z.object({
	id: z.number().int().positive(),
	inline: z.boolean().default(false).meta({
		description:
			"Return image bytes even when a public delivery URL is available.",
	}),
});

export const outputSchema = z.object({
	data: z
		.discriminatedUnion("kind", [
			z.object({
				kind: z.literal("link"),
				id: z.number().meta({ description: "Previewed media ID." }),
				url: z.string().meta({
					description: "Public image URL also returned as a resource link.",
				}),
				mimeType: z.string().meta({ description: "Image MIME type." }),
			}),
			z.object({
				kind: z.literal("inline"),
				id: z.number().meta({ description: "Previewed media ID." }),
				mimeType: z.string().meta({ description: "Image MIME type." }),
				byteLength: z
					.number()
					.meta({ description: "Size of the inline image content in bytes." }),
			}),
		])
		.meta({
			description: "Public resource link or bounded inline image preview.",
		}),
});
