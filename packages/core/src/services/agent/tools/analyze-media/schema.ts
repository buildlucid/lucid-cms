import z from "zod";

export const inputSchema = z
	.object({
		mediaId: z
			.number()
			.int()
			.positive()
			.describe("ID of Lucid media linked to this chat."),
		question: z
			.string()
			.trim()
			.min(1)
			.max(8000)
			.describe(
				"What to examine or extract from the image, audio recording, video or PDF.",
			),
	})
	.strict();
export const outputSchema = z.object({ analysis: z.string() });
