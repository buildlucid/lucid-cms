import z from "zod";
import {
	fileMetadataSchema,
	fileSchema,
	mediaActorSchema,
	originSchema,
	uploadValidationSchema,
} from "../schema.js";

export const inputSchema = fileMetadataSchema.extend({
	/** Media ID to preserve. The replacement must have the same media type. */
	id: z.number().int().positive(),
	file: fileSchema,
	actor: mediaActorSchema,
	/** Omit to preserve the current origin. */
	origin: originSchema.optional(),
	validation: uploadValidationSchema.optional(),
});
