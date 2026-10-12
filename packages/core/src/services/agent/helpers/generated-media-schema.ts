import z from "zod";

/** What generation tools return once their media is saved. */
export const generatedMediaOutputSchema = z.object({
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
