import z from "zod";
import { cmsAiGenerateCompletedDataSchema } from "./ai.js";
import { webUrlSchema } from "./web.js";

export const MAX_MEDIA_BYTES = 6_000_000;
export const MAX_MEDIA_BASE64_LENGTH = 8_000_000;

export const mediaMimeTypeSchema = z.enum([
	"image/jpeg",
	"image/png",
	"image/webp",
	"image/gif",
	"application/pdf",
	"audio/mpeg",
	"audio/wav",
	"audio/ogg",
	"audio/flac",
	"audio/mp4",
	"video/mp4",
	"video/webm",
	"video/quicktime",
	"video/mpeg",
	"text/plain",
	"text/markdown",
	"text/csv",
]);

/** A public URL or inline file to analyse. Private media must use inline data. */
export const mediaSourceSchema = z.discriminatedUnion("type", [
	z
		.object({
			type: z.literal("url"),
			url: webUrlSchema.refine((value) => new URL(value).protocol === "https:"),
			mimeType: mediaMimeTypeSchema.optional(),
			filename: z.string().trim().min(1).max(255).optional(),
		})
		.strict(),
	z
		.object({
			type: z.literal("base64"),
			data: z
				.string()
				.min(4)
				.max(MAX_MEDIA_BASE64_LENGTH)
				.regex(/^[A-Za-z0-9+/]+={0,2}$/)
				.refine((value) => value.length % 4 === 0),
			mimeType: mediaMimeTypeSchema,
			filename: z.string().trim().min(1).max(255).optional(),
		})
		.strict(),
]);

export const mediaAnalyzeRequestSchema = z
	.object({
		feature: z
			.object({ key: z.literal("media.analyze"), version: z.literal("v1") })
			.strict(),
		sessionId: z.uuid(),
		input: z.array(z.never()).max(0),
		context: z
			.object({
				question: z.string().trim().min(1).max(8_000),
				source: mediaSourceSchema,
			})
			.strict(),
	})
	.strict();

export const mediaAnalysisSchema = z.object({
	analysis: z.string().trim().min(1),
});
export const mediaAnalyzeResponseSchema =
	cmsAiGenerateCompletedDataSchema.extend({
		mode: z.literal("sync"),
		feature: mediaAnalyzeRequestSchema.shape.feature,
		output: mediaAnalysisSchema,
	});

export type MediaMimeType = z.infer<typeof mediaMimeTypeSchema>;
export type MediaSource = z.infer<typeof mediaSourceSchema>;
export type MediaAnalyzeRequest = z.infer<typeof mediaAnalyzeRequestSchema>;
export type MediaAnalyzeResponse = z.infer<typeof mediaAnalyzeResponseSchema>;
