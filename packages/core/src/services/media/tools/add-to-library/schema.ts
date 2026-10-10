import z from "zod";

export const inputSchema = z
	.object({
		mediaId: z
			.number()
			.int()
			.positive()
			.describe(
				"ID of personal media of the person you act for, such as a chat upload.",
			),
		public: z
			.boolean()
			.default(true)
			.describe(
				"Whether anyone can open the file without signing in. Pages need public media.",
			),
		title: z
			.string()
			.trim()
			.max(255)
			.optional()
			.describe(
				"A title for the media library, in the default content language.",
			),
		alt: z
			.string()
			.trim()
			.max(1000)
			.optional()
			.describe("Alt text for an image, in the default content language."),
	})
	.strict();

export const outputSchema = z.object({
	media: z
		.object({ id: z.number(), public: z.boolean() })
		.meta({ description: "The media added to the library." }),
});
