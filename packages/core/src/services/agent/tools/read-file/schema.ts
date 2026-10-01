import z from "zod";
import type { AgentFileReadOutput } from "../../../../types/response.js";

export const fileMimeTypeSchema = z.enum([
	"text/plain",
	"text/markdown",
	"text/csv",
	"text/tab-separated-values",
	"application/json",
	"text/yaml",
	"application/yaml",
	"text/html",
	"application/xml",
	"text/xml",
	"image/svg+xml",
	"text/vtt",
	"application/x-subrip",
	"text/calendar",
]);

export const inputSchema = z
	.object({
		mediaId: z
			.number()
			.int()
			.positive()
			.describe(
				"ID of accessible Lucid media from the person or tool results.",
			),
		offset: z
			.number()
			.int()
			.nonnegative()
			.default(0)
			.describe(
				"Text position to read or search from. Use nextOffset from a previous result.",
			),
		search: z
			.string()
			.trim()
			.min(1)
			.max(256)
			.nullable()
			.describe(
				"Use null to read a page, including for an overview or open-ended question. A string searches for literal text, ignoring case and differences in spacing or line breaks, and returns short surrounding passages.",
			),
	})
	.strict();

export const outputSchema = z.object({
	mediaId: z.number(),
	filename: z.string().optional(),
	mimeType: fileMimeTypeSchema,
	contentType: z.enum(["text", "extracted-text"]),
	mode: z.enum(["read", "search"]),
	totalChars: z.number(),
	passages: z.array(z.object({ offset: z.number(), text: z.string() })),
	nextOffset: z.number().nullable(),
	truncated: z.boolean(),
}) satisfies z.ZodType<AgentFileReadOutput>;
