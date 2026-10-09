import z from "zod";
import { documentIdInput, writeInput, writeOutputSchema } from "../schema.js";

export const brickChangeSchema = z
	.object({
		ref: z.string().min(1).optional().meta({
			description: "A builder or embedded brick to change, move or remove.",
		}),
		key: z.string().min(1).optional().meta({
			description:
				"A fixed brick to change, or the kind of builder brick to add. With ref, it must match that brick's key.",
		}),
		fields: writeInput.fields.optional(),
		before: z.string().min(1).optional().meta({
			description:
				"Places the brick before the brick with this ref. New bricks go at the end without it.",
		}),
		remove: z
			.boolean()
			.optional()
			.meta({ description: "Removes the brick with this ref." }),
	})
	.refine((brick) => brick.ref !== undefined || brick.key !== undefined, {
		message: "Give a ref or key",
	});

export const inputSchema = z
	.object({
		collectionKey: writeInput.collectionKey,
		documentId: documentIdInput,
		contentLocale: writeInput.contentLocale,
		requestId: writeInput.requestId,
		fields: writeInput.fields.optional(),
		bricks: z.array(brickChangeSchema).optional().meta({
			description:
				"Brick changes in order, using refs and keys from documents_get. Omitted bricks and fields keep their values.",
		}),
		request: writeInput.request,
	})
	.refine((input) => input.fields !== undefined || input.bricks?.length, {
		message: "Give fields or bricks to change",
	});

export const outputSchema = writeOutputSchema;
