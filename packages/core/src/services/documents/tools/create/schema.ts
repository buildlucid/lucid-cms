import z from "zod";
import { writeInput, writeOutputSchema } from "../schema.js";

export const inputSchema = z.object({
	collectionKey: writeInput.collectionKey,
	contentLocale: writeInput.contentLocale,
	fields: writeInput.fields.optional(),
	bricks: z
		.array(
			z.object({
				key: z.string().min(1).meta({ description: "Brick key." }),
				fields: writeInput.fields.optional(),
			}),
		)
		.optional()
		.meta({
			description:
				"Fixed bricks by key, and builder bricks in page order. Omitted fields use their defaults.",
		}),
	request: writeInput.request,
});

export const outputSchema = writeOutputSchema;
