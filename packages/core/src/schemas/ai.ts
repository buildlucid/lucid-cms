import z from "zod";
import type { ControllerSchema } from "../types.js";

const aiMaxBase64ImageLength = 8_000_000;
const aiImageDetailSchema = z.enum(["low", "high", "auto"]).default("low");

const localeSchema = z
	.object({
		source: z.string().trim().min(2).max(32).optional(),
		target: z
			.array(z.string().trim().min(2).max(32))
			.min(1)
			.superRefine((locales, context) => {
				if (new Set(locales).size !== locales.length) {
					context.addIssue({
						code: "custom",
						message: "Target locales must be unique.",
					});
				}
			}),
	})
	.strict();

const aiGenerateResponseSchema = z
	.object({
		requestId: z.string(),
		feature: z
			.object({
				key: z.string(),
				version: z.string(),
			})
			.strict(),
		output: z.unknown(),
		usage: z
			.object({
				model: z.string(),
				providerRequestId: z.string().optional(),
				tokens: z
					.object({
						input: z
							.object({
								text: z.number().int().nonnegative(),
								image: z.number().int().nonnegative(),
								audio: z.number().int().nonnegative(),
								cached: z
									.object({
										total: z.number().int().nonnegative(),
										text: z.number().int().nonnegative(),
										image: z.number().int().nonnegative(),
										audio: z.number().int().nonnegative(),
									})
									.strict(),
								total: z.number().int().nonnegative(),
							})
							.strict(),
						output: z
							.object({
								text: z.number().int().nonnegative(),
								image: z.number().int().nonnegative(),
								audio: z.number().int().nonnegative(),
								reasoning: z.number().int().nonnegative(),
								acceptedPrediction: z.number().int().nonnegative(),
								rejectedPrediction: z.number().int().nonnegative(),
								total: z.number().int().nonnegative(),
							})
							.strict(),
						total: z.number().int().nonnegative(),
					})
					.strict(),
				cost: z
					.object({
						currency: z.string(),
						totalCostMinor: z.number().int().nonnegative(),
					})
					.strict(),
			})
			.strict(),
	})
	.strict();

export const controllerSchemas = {
	customFieldInput: {
		body: z
			.object({
				instruction: z.string().trim().min(1).max(8_000),
				guidance: z.string().trim().min(1).optional(),
				currentValue: z.unknown().optional(),
				target: z
					.object({
						collectionKey: z.string().trim().min(1),
						brickKey: z.string().trim().min(1).optional(),
						fieldKey: z.string().trim().min(1),
					})
					.strict(),
				locale: localeSchema,
			})
			.strict(),
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: undefined,
		response: aiGenerateResponseSchema.extend({
			feature: z
				.object({
					key: z.literal("custom-field.input.generate"),
					version: z.literal("v1"),
				})
				.strict(),
			output: z.record(z.string().trim().min(2).max(32), z.unknown()),
		}),
	} satisfies ControllerSchema,
	mediaAlt: {
		body: z
			.object({
				instruction: z.string().trim().min(1).max(8_000).optional(),
				guidance: z.string().trim().min(1).optional(),
				previousResponses: z
					.array(
						z
							.object({
								instruction: z.string().trim().min(1).max(8_000).optional(),
								output: z.record(
									z.string().trim().min(2).max(32),
									z.string().trim(),
								),
							})
							.strict(),
					)
					.max(10)
					.optional(),
				image: z
					.object({
						data: z.string().trim().min(1).max(aiMaxBase64ImageLength),
						mimeType: z.literal("image/webp"),
						detail: aiImageDetailSchema,
						filename: z.string().trim().min(1).max(255).optional(),
					})
					.strict(),
				media: z
					.object({
						id: z.union([z.string().trim().min(1), z.number()]).optional(),
						name: z
							.record(z.string().trim().min(2).max(32), z.string().trim())
							.optional(),
						alt: z
							.record(z.string().trim().min(2).max(32), z.string().trim())
							.optional(),
					})
					.strict(),
				locale: localeSchema,
			})
			.strict(),
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: undefined,
		response: aiGenerateResponseSchema.extend({
			feature: z
				.object({
					key: z.literal("media.alt.generate"),
					version: z.literal("v1"),
				})
				.strict(),
			output: z.record(z.string().trim().min(2).max(32), z.string()),
		}),
	} satisfies ControllerSchema,
	mediaImageGenerate: {
		body: z
			.object({
				instruction: z.string().trim().min(1).max(8_000),
				guidance: z.string().trim().min(1).optional(),
				image: z
					.object({
						type: z.literal("url"),
						url: z.url().trim().max(2_048),
						detail: aiImageDetailSchema,
						filename: z.string().trim().min(1).max(255).optional(),
						mimeType: z
							.enum(["image/webp", "image/png", "image/jpeg"])
							.optional(),
					})
					.strict()
					.optional(),
				generation: z
					.object({
						size: z
							.enum([
								"auto",
								"1024x1024",
								"1536x1024",
								"1024x1536",
								"2048x2048",
								"2048x1152",
								"3840x2160",
								"2160x3840",
							])
							.default("1024x1024"),
						quality: z
							.enum(["auto", "low", "medium", "high"])
							.default("medium"),
						outputFormat: z.enum(["webp", "png", "jpeg"]).default("webp"),
					})
					.strict()
					.default({
						size: "1024x1024",
						quality: "medium",
						outputFormat: "webp",
					}),
			})
			.strict(),
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: undefined,
		response: aiGenerateResponseSchema.extend({
			feature: z
				.object({
					key: z.literal("media.image.generate"),
					version: z.literal("v1"),
				})
				.strict(),
			output: z
				.object({
					id: z.string(),
					url: z.string(),
					urlExpiresAt: z.string(),
					storageKey: z.string(),
					byteSize: z.number().int().nonnegative(),
					mimeType: z.string(),
					extension: z.string(),
					size: z.string(),
					quality: z.string(),
					outputFormat: z.string(),
				})
				.strict(),
		}),
	} satisfies ControllerSchema,
};

export type CustomFieldInputBody = z.infer<
	typeof controllerSchemas.customFieldInput.body
>;
export type MediaAltBody = z.infer<typeof controllerSchemas.mediaAlt.body>;
export type MediaImageGenerateBody = z.infer<
	typeof controllerSchemas.mediaImageGenerate.body
>;
