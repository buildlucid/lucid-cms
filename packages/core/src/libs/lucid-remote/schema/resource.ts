import z from "zod";
import { cmsAiGenerateCompletedDataSchema } from "./ai.js";
import { webUrlSchema } from "./web.js";

export const MAX_RESOURCE_BYTES = 6_000_000;
export const MAX_RESOURCE_BASE64_LENGTH = 8_000_000;

export const resourceMimeTypeSchema = z.enum([
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
export const resourceSourceSchema = z.discriminatedUnion("type", [
	z
		.object({
			type: z.literal("url"),
			url: webUrlSchema.refine((value) => new URL(value).protocol === "https:"),
			mimeType: resourceMimeTypeSchema.optional(),
			filename: z.string().trim().min(1).max(255).optional(),
		})
		.strict(),
	z
		.object({
			type: z.literal("base64"),
			data: z
				.string()
				.min(4)
				.max(MAX_RESOURCE_BASE64_LENGTH)
				.regex(/^[A-Za-z0-9+/]+={0,2}$/)
				.refine((value) => value.length % 4 === 0),
			mimeType: resourceMimeTypeSchema,
			filename: z.string().trim().min(1).max(255).optional(),
		})
		.strict(),
]);

export const resourceAnalyzeRequestSchema = z
	.object({
		feature: z
			.object({ key: z.literal("resource.analyze"), version: z.literal("v1") })
			.strict(),
		sessionId: z.uuid(),
		input: z.array(z.never()).max(0),
		context: z
			.object({
				question: z.string().trim().min(1).max(8_000),
				source: resourceSourceSchema,
			})
			.strict(),
	})
	.strict();

export const resourceAnalysisSchema = z.object({
	analysis: z.string().trim().min(1),
});
export const resourceAnalyzeResponseSchema =
	cmsAiGenerateCompletedDataSchema.extend({
		mode: z.literal("sync"),
		feature: resourceAnalyzeRequestSchema.shape.feature,
		output: resourceAnalysisSchema,
	});

export type ResourceMimeType = z.infer<typeof resourceMimeTypeSchema>;
export type ResourceSource = z.infer<typeof resourceSourceSchema>;
export type ResourceAnalyzeRequest = z.infer<
	typeof resourceAnalyzeRequestSchema
>;
export type ResourceAnalyzeResponse = z.infer<
	typeof resourceAnalyzeResponseSchema
>;
