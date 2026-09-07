import { Readable } from "node:stream";
import z from "zod";

/** File sources accepted by the media toolkit. Streams require their exact byte size. */
export const fileSchema = z.union([
	z
		.instanceof(File)
		.refine((file) => file.name.trim().length > 0, "Provide a filename."),
	z.object({
		fileName: z.string().trim().min(1),
		mimeType: z.string().trim().optional(),
		body: z.instanceof(Uint8Array),
	}),
	z.object({
		fileName: z.string().trim().min(1),
		mimeType: z.string().trim().optional(),
		body: z.union([
			z.instanceof(Readable),
			z.instanceof(ReadableStream<Uint8Array>),
		]),
		size: z.number().int().nonnegative(),
	}),
]);

export const originSchema = z.enum(["human", "ai_generated", "ai_modified"]);

export const userIdSchema = z
	.number()
	.int()
	.positive()
	.nullable()
	.default(null);

export const translationsSchema = z.array(
	z.object({
		localeCode: z.string().trim().min(1).nullable(),
		value: z.string().trim().nullable(),
	}),
);

export const focalPointSchema = z.object({
	x: z.number().min(0).max(1),
	y: z.number().min(0).max(1),
});

export const fileMetadataSchema = z.object({
	width: z.number().positive().optional(),
	height: z.number().positive().optional(),
	duration: z.number().nonnegative().nullable().optional(),
	focalPoint: focalPointSchema.optional(),
	blurHash: z.string().trim().optional(),
	averageColor: z.string().trim().optional(),
	base64: z.string().trim().nullable().optional(),
	isDark: z.boolean().optional(),
	isLight: z.boolean().optional(),
});

export const uploadValidationSchema = z.object({
	maxBytes: z.number().int().nonnegative().optional(),
	mimeTypes: z
		.array(
			z
				.string()
				.trim()
				.toLowerCase()
				.regex(/^[a-z0-9!#$&^_.+-]+\/(?:[a-z0-9!#$&^_.+-]+|\*)$/),
		)
		.min(1)
		.optional(),
});
