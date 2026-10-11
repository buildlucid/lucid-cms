import z from "zod";
import { writeInput } from "../../../documents/tools/schema.js";
import { brickChangeSchema } from "../../../documents/tools/update/schema.js";

export const inputSchema = z
	.object({
		contentLocale: writeInput.contentLocale,
		fields: writeInput.fields.optional(),
		bricks: z.array(brickChangeSchema).optional().meta({
			description:
				"Brick changes in order, using refs and keys from lucid_builder_read. Omitted bricks and fields keep their values.",
		}),
	})
	.refine((input) => input.fields !== undefined || input.bricks?.length, {
		message: "Give fields or bricks to change",
	});

export const outputSchema = z.object({
	applied: z.boolean().meta({
		description: "Whether the builder now holds the changes as unsaved edits.",
	}),
	validationErrors: z.array(z.string()).optional().meta({
		description:
			"Errors the builder would show on save, to fix before finishing.",
	}),
	note: z.string(),
});
