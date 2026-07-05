import z from "zod";
import type { ControllerSchema } from "../types.js";
import { brickInputSchema } from "./collection-bricks.js";
import { fieldInputSchema } from "./collection-fields.js";
import { queryFormatted, queryString } from "./helpers/querystring.js";
import { mediaEmbedResponseSchema } from "./media.js";

const aiMaxBase64ImageLength = 8_000_000;
const aiImageDetailSchema = z.enum(["low", "high", "auto"]).default("low");
const mediaImageMaxEdgeLength = 3_840;
const mediaImageMinPixels = 655_360;
const mediaImageMaxPixels = 8_294_400;
const mediaImageMaxAspectRatio = 3;
const mediaImageSizeIncrement = 16;

const mediaImageCustomSizeSchema = z
	.tuple([z.number(), z.number()])
	.superRefine(([width, height], context) => {
		const hasValidEdges =
			Number.isInteger(width) &&
			Number.isInteger(height) &&
			width > 0 &&
			height > 0;

		if (!hasValidEdges) {
			context.addIssue({
				code: "custom",
				message: "Image width and height must be positive whole pixels.",
			});
			return;
		}

		if (width > mediaImageMaxEdgeLength || height > mediaImageMaxEdgeLength) {
			context.addIssue({
				code: "custom",
				message: `Image width and height must not exceed ${mediaImageMaxEdgeLength}px.`,
			});
		}

		if (
			width % mediaImageSizeIncrement !== 0 ||
			height % mediaImageSizeIncrement !== 0
		) {
			context.addIssue({
				code: "custom",
				message: `Image width and height must be multiples of ${mediaImageSizeIncrement}px.`,
			});
		}

		const longEdge = Math.max(width, height);
		const shortEdge = Math.min(width, height);
		if (longEdge / shortEdge > mediaImageMaxAspectRatio) {
			context.addIssue({
				code: "custom",
				message: `Image long edge to short edge ratio must not exceed ${mediaImageMaxAspectRatio}:1.`,
			});
		}

		const pixels = width * height;
		if (pixels < mediaImageMinPixels || pixels > mediaImageMaxPixels) {
			context.addIssue({
				code: "custom",
				message: `Image total pixels must be between ${mediaImageMinPixels} and ${mediaImageMaxPixels}.`,
			});
		}
	});

const mediaImageGenerationSchema = z
	.object({
		size: z
			.union(
				[
					z.enum([
						"auto",
						"1024x1024",
						"1536x1024",
						"1024x1536",
						"2048x2048",
						"2048x1152",
						"3840x2160",
						"2160x3840",
					]),
					mediaImageCustomSizeSchema,
				],
				{
					error:
						"Image resolution must be a preset or custom width and height.",
				},
			)
			.default("1024x1024"),
		quality: z.enum(["auto", "low", "medium", "high"]).default("medium"),
		outputFormat: z.enum(["webp", "png", "jpeg"]).default("webp"),
	})
	.strict()
	.default({
		size: "1024x1024",
		quality: "medium",
		outputFormat: "webp",
	});

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
		mode: z.enum(["sync", "async"]),
		status: z.literal("complete").optional(),
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

const aiGenerateAcceptedResponseSchema = z
	.object({
		mode: z.literal("async"),
		requestId: z.string(),
		feature: z
			.object({
				key: z.string(),
				version: z.string(),
			})
			.strict(),
		status: z.enum(["queued", "processing"]),
	})
	.strict();

const mediaImageFeatureSchema = z
	.object({
		key: z.literal("media.image.generate"),
		version: z.literal("v1"),
	})
	.strict();

const mediaImageGenerateResponseSchema =
	aiGenerateAcceptedResponseSchema.extend({
		feature: mediaImageFeatureSchema,
	});

const mediaImageCompletionResponseSchema = aiGenerateResponseSchema.extend({
	feature: mediaImageFeatureSchema,
	output: z
		.object({
			id: z.string(),
			url: z.string(),
			storageKey: z.string(),
			byteSize: z.number().int().nonnegative(),
			mimeType: z.string(),
			extension: z.string(),
			size: z.string(),
			quality: z.string(),
			outputFormat: z.string(),
		})
		.strict(),
});

const aiUsageChartDateSchema = z
	.string()
	.trim()
	.regex(/^\d{4}-\d{2}-\d{2}$/);

const aiUsageChartDimensionSchema = z.enum(["day"]);
const aiUsageChartMetricSchema = z.enum(["requests", "totalTokens", "cost"]);

export const controllerSchemas = {
	getUsageChart: {
		body: undefined,
		query: {
			string: z
				.object({
					dimension: aiUsageChartDimensionSchema.optional().meta({
						description: "Groups chart points by the selected dimension.",
						example: "day",
					}),
					metric: z
						.string()
						.trim()
						.superRefine((value, ctx) => {
							const metrics = value
								.split(",")
								.map((metric) => metric.trim())
								.filter(Boolean);

							if (metrics.length === 0) {
								ctx.addIssue({
									code: "custom",
									message: "At least one metric must be provided.",
								});
								return;
							}

							for (const metric of metrics) {
								if (!aiUsageChartMetricSchema.safeParse(metric).success) {
									ctx.addIssue({
										code: "custom",
										message: `Unsupported metric "${metric}".`,
									});
								}
							}
						})
						.optional()
						.meta({
							description:
								"Comma-separated usage metrics to aggregate. Supported values are requests, totalTokens, and cost.",
							example: "requests,totalTokens",
						}),
					startDate: aiUsageChartDateSchema.optional().meta({
						description: "Inclusive chart start date in YYYY-MM-DD format.",
						example: "2026-06-01",
					}),
					endDate: aiUsageChartDateSchema.optional().meta({
						description: "Inclusive chart end date in YYYY-MM-DD format.",
						example: "2026-06-07",
					}),
					"filter[featureKey]": queryString.schema.filter(false, {
						example: "media.image.generate",
					}),
				})
				.meta(queryString.meta),
			formatted: undefined,
		},
		params: undefined,
		response: z
			.object({
				dimension: aiUsageChartDimensionSchema,
				metrics: z.array(aiUsageChartMetricSchema),
				startDate: aiUsageChartDateSchema,
				endDate: aiUsageChartDateSchema,
				currency: z.string().nullable(),
				feature: z
					.object({
						key: z.string(),
						label: z.string(),
					})
					.strict()
					.nullable(),
				series: z.array(
					z
						.object({
							metric: aiUsageChartMetricSchema,
							points: z.array(
								z
									.object({
										date: aiUsageChartDateSchema,
										value: z.number().nonnegative(),
									})
									.strict(),
							),
						})
						.strict(),
				),
			})
			.strict(),
	} satisfies ControllerSchema,
	getUsage: {
		body: undefined,
		query: {
			string: z
				.object({
					"filter[featureKey]": queryString.schema.filter(false, {
						example: "media.image.generate",
					}),
					"filter[status]": queryString.schema.filter(true, {
						example: "success",
					}),
					"filter[model]": queryString.schema.filter(false, {
						example: "gpt-image-1",
					}),
					"filter[userId]": queryString.schema.filter(true, {
						example: "1",
					}),
					sort: queryString.schema.sort("createdAt,cost,durationMs"),
					page: queryString.schema.page,
					perPage: queryString.schema.perPage,
				})
				.meta(queryString.meta),
			formatted: z.object({
				filter: z
					.object({
						featureKey: queryFormatted.schema.filters.single.optional(),
						status: queryFormatted.schema.filters.union.optional(),
						model: queryFormatted.schema.filters.single.optional(),
						userId: queryFormatted.schema.filters.union.optional(),
					})
					.optional(),
				sort: z
					.array(
						z.object({
							key: z.enum(["createdAt", "cost", "durationMs"]),
							direction: z.enum(["asc", "desc"]),
						}),
					)
					.optional(),
				page: queryFormatted.schema.page,
				perPage: queryFormatted.schema.perPage,
			}),
		},
		params: undefined,
		response: z.array(
			z
				.object({
					id: z.number(),
					requestId: z.string(),
					providerRequestId: z.string().nullable(),
					feature: z
						.object({
							key: z.string(),
							label: z.string(),
							version: z.string(),
						})
						.strict(),
					status: z.enum(["failed", "pending", "success"]),
					model: z.string().nullable(),
					createdAt: z.string().nullable(),
					durationMs: z.number().nullable(),
					errorMessage: z.string().nullable(),
					tokens: z
						.object({
							input: z.number().int().nonnegative(),
							output: z.number().int().nonnegative(),
							total: z.number().int().nonnegative(),
						})
						.strict()
						.nullable(),
					cost: z
						.object({
							currency: z.string(),
							totalCostMinor: z.number().int().nonnegative(),
						})
						.strict()
						.nullable(),
					target: z
						.object({
							type: z.string(),
							data: z.record(z.string(), z.unknown()),
						})
						.strict(),
					user: z
						.object({
							id: z.number(),
							username: z.string(),
							email: z.email(),
							firstName: z.string().nullable(),
							lastName: z.string().nullable(),
							profilePicture: mediaEmbedResponseSchema.nullable(),
						})
						.strict()
						.nullable(),
				})
				.strict(),
		),
	} satisfies ControllerSchema,
	customFieldInput: {
		body: z
			.object({
				instruction: z.string().trim().min(1).max(8_000).optional(),
				guidance: z.string().trim().min(1).optional(),
				value: z.record(z.string().trim().min(2).max(32), z.unknown()),
				document: z
					.object({
						fields: z.array(fieldInputSchema).optional(),
						bricks: z.array(brickInputSchema).optional(),
					})
					.strict()
					.optional(),
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
				instruction: z.string().trim().min(1).max(8_000).optional(),
				guidance: z.string().trim().min(1).optional(),
				previousInstructions: z
					.array(z.string().trim().min(1).max(8_000))
					.max(10)
					.optional(),
				image: z
					.discriminatedUnion("type", [
						z
							.object({
								type: z.literal("url"),
								url: z.url().trim().max(2_048),
								detail: aiImageDetailSchema,
								filename: z.string().trim().min(1).max(255).optional(),
								mimeType: z
									.enum(["image/webp", "image/png", "image/jpeg"])
									.optional(),
							})
							.strict(),
						z
							.object({
								type: z.literal("base64"),
								data: z.string().trim().min(1).max(aiMaxBase64ImageLength),
								mimeType: z.enum(["image/webp", "image/png", "image/jpeg"]),
								detail: aiImageDetailSchema,
								filename: z.string().trim().min(1).max(255).optional(),
							})
							.strict(),
					])
					.optional(),
				generation: mediaImageGenerationSchema,
			})
			.strict(),
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: undefined,
		response: mediaImageGenerateResponseSchema,
	} satisfies ControllerSchema,
	mediaImageCompletion: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: z
			.object({
				requestId: z.uuid(),
			})
			.strict(),
		response: z.union([
			mediaImageGenerateResponseSchema,
			mediaImageCompletionResponseSchema,
		]),
	} satisfies ControllerSchema,
};

export type CustomFieldInputBody = z.infer<
	typeof controllerSchemas.customFieldInput.body
>;
export type MediaAltBody = z.infer<typeof controllerSchemas.mediaAlt.body>;
export type MediaImageGenerateBody = z.infer<
	typeof controllerSchemas.mediaImageGenerate.body
>;
export type MediaImageCompletionParams = z.infer<
	typeof controllerSchemas.mediaImageCompletion.params
>;
export type GetUsageChartQueryParams = z.infer<
	typeof controllerSchemas.getUsageChart.query.string
>;
export type GetUsageQueryParams = z.infer<
	typeof controllerSchemas.getUsage.query.formatted
>;
