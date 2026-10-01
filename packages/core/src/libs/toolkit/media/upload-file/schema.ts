import z from "zod";
import {
	fileMetadataSchema,
	fileSchema,
	originSchema,
	translationsSchema,
	uploadValidationSchema,
	userIdSchema,
} from "../schema.js";

export const inputSchema = fileMetadataSchema.extend({
	/** File, bytes or a binary stream to upload. */
	file: fileSchema,
	/** CMS user credited with the upload. Defaults to no attribution. */
	userId: userIdSchema,
	/** File provenance. Defaults to human. */
	origin: originSchema.default("human"),
	/** Allow unauthenticated file access. Defaults to false. */
	public: z.boolean().default(false),
	/** Keeps the file out of the media library for a feature that manages it, like an OAuth client logo. Defaults to false. */
	isSystem: z.boolean().default(false),
	folderId: z.number().int().positive().nullable().optional(),
	title: translationsSchema.optional(),
	alt: translationsSchema.optional(),
	description: translationsSchema.optional(),
	summary: translationsSchema.optional(),
	/** Additional file size and MIME type restrictions. */
	validation: uploadValidationSchema.optional(),
});
