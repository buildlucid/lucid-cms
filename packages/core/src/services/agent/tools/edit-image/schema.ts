import z from "zod";
import { inputSchema as generateInputSchema } from "../generate-image/schema.js";

export const inputSchema = generateInputSchema.extend({
	mediaId: z.number().int().positive().meta({
		description:
			"The Lucid image the person asked you to change, eg. one they attached. Supported types: image/webp, image/png, image/jpeg.",
	}),
	instruction: generateInputSchema.shape.instruction.meta({
		description:
			"How to change the image, in detail: what to add, remove or restyle, and what to keep.",
	}),
});
