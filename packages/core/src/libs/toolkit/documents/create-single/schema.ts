import z from "zod";
import { richTextJSONSchema } from "../../../../schemas/shared/rich-text.js";
import { documentWriteSchema } from "../authoring-schema.js";
import { documentDataSchema } from "../authoring-values-schema.js";

export const inputSchema = documentWriteSchema.extend({
	data: documentDataSchema,
	/**
	 * Saves the document as the proposal of a new create request, for people to
	 * review. It stays hidden from content until the request is completed.
	 */
	request: z
		.strictObject({
			title: z.string().trim().min(1).max(200),
			description: richTextJSONSchema.nullable().optional(),
		})
		.optional(),
});
