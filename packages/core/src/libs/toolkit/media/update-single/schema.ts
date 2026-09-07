import z from "zod";
import {
	focalPointSchema,
	originSchema,
	translationsSchema,
	userIdSchema,
} from "../schema.js";

export const inputSchema = z.object({
	id: z.number().int().positive(),
	fileName: z.string().trim().min(1).optional(),
	folderId: z.number().int().positive().nullable().optional(),
	public: z.boolean().optional(),
	isHidden: z.boolean().optional(),
	isDeleted: z.boolean().optional(),
	origin: originSchema.optional(),
	title: translationsSchema.optional(),
	alt: translationsSchema.optional(),
	description: translationsSchema.optional(),
	summary: translationsSchema.optional(),
	width: z.number().positive().nullable().optional(),
	height: z.number().positive().nullable().optional(),
	duration: z.number().nonnegative().nullable().optional(),
	focalPoint: focalPointSchema.nullable().optional(),
	blurHash: z.string().trim().nullable().optional(),
	averageColor: z.string().trim().nullable().optional(),
	base64: z.string().trim().nullable().optional(),
	isDark: z.boolean().nullable().optional(),
	isLight: z.boolean().nullable().optional(),
	userId: userIdSchema,
});
