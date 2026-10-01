import z from "zod";

export const inputSchema = z
	.object({
		mediaId: z
			.number()
			.int()
			.positive()
			.describe("A personal media ID linked to this chat, such as an upload."),
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
			.describe("A title for the media library, in the default locale."),
		alt: z
			.string()
			.trim()
			.max(1000)
			.optional()
			.describe("Alt text for an image, in the default locale."),
	})
	.strict();

export const outputSchema = z.object({
	mediaId: z.number(),
	public: z.boolean(),
});
