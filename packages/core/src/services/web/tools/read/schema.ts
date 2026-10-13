import z from "zod";
import { webUrlSchema } from "../../../../libs/lucid-remote/schema/web.js";
import { webSourceSchema } from "../schema.js";

export const inputSchema = z.object({
	url: webUrlSchema,
	objective: z
		.string()
		.trim()
		.min(1)
		.max(2000)
		.optional()
		.describe(
			"A specific question to answer from excerpts. Omit to read page text and links.",
		),
});

export const outputSchema = webSourceSchema.extend({
	content: z.string(),
	contentType: z.enum(["page", "excerpts"]),
	truncated: z.boolean(),
});
