import z from "zod";
import { webUrlSchema } from "../../../../libs/lucid-remote/schema/web.js";

export const inputSchema = z
	.object({
		question: z
			.string()
			.trim()
			.min(1)
			.max(8000)
			.describe("What to examine or extract from the file."),
		source: z.discriminatedUnion("type", [
			z
				.object({
					type: z.literal("url"),
					url: webUrlSchema.refine((url) => url.startsWith("https://")),
				})
				.strict(),
			z
				.object({
					type: z.literal("media"),
					mediaId: z.number().int().positive(),
				})
				.strict(),
		]),
	})
	.strict();
export const outputSchema = z.object({ analysis: z.string() });
