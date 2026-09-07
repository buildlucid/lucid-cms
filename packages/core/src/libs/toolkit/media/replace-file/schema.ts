import z from "zod";
import {
	fileMetadataSchema,
	fileSchema,
	originSchema,
	uploadValidationSchema,
	userIdSchema,
} from "../schema.js";

export const inputSchema = fileMetadataSchema.extend({
	/** Media ID to preserve. The replacement must have the same media type. */
	id: z.number().int().positive(),
	file: fileSchema,
	userId: userIdSchema,
	/** Omit to preserve the current origin. */
	origin: originSchema.optional(),
	validation: uploadValidationSchema.optional(),
});
