import z from "zod";
import { transferEntrySchema } from "../../../libs/transfer/schema.js";

const textSchema = z
	.array(
		z.object({
			localeCode: z.string().nullable(),
			value: z.string().nullable(),
		}),
	)
	.optional();

export const mediaEntrySchema = transferEntrySchema.extend({
	fileName: z.string().min(1),
	mimeType: z.string().min(1),
	type: z.enum(["image", "video", "audio", "document", "archive", "unknown"]),
	size: z.number().int().nonnegative(),
	public: z.boolean(),
	folder: z.array(z.string().min(1)),
	meta: z.object({
		width: z.number().nullable(),
		height: z.number().nullable(),
		duration: z.number().nullable(),
		focalPoint: z.object({ x: z.number(), y: z.number() }).nullable(),
		blurHash: z.string().nullable(),
		averageColor: z.string().nullable(),
		base64: z.string().nullable(),
		isDark: z.boolean().nullable(),
		isLight: z.boolean().nullable(),
	}),
	text: z.object({
		title: textSchema,
		alt: textSchema,
		description: textSchema,
		summary: textSchema,
		transcript: textSchema,
	}),
	url: z.string().nullable(),
});

export type MediaEntry = z.infer<typeof mediaEntrySchema>;

/** Media to export by ID. */
export const mediaSelectionSchema = z
	.array(z.number().int().positive())
	.min(1)
	.transform((ids) => ids.map(String));
