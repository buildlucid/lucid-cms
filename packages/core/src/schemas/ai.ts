import z from "zod";
import constants from "../constants/constants.js";
import type { ControllerSchema } from "../exports/types.js";
import { mediaGenerationTypes } from "../libs/config/ai-features.js";
import {
	cmsAiGenerateAcceptedDataSchema,
	cmsAiGenerateCompletedDataSchema,
	cmsAiMediaOutputSchemas,
} from "../libs/lucid-remote/schema/ai.js";
import { generatedContentSchema } from "../libs/lucid-remote/schema/generated-content.js";
import { mediaModelCatalogSchemas } from "../libs/lucid-remote/services/get-media-models.js";
import type {
	AiCredits,
	AiUsageFeatureKey,
	AiUsageRecord,
	AiUsageSession,
	AiUsageSessionType,
	MediaGenerationType,
	SavedGeneratedMedia,
} from "../types/response.js";
import { queryFormatted, queryString } from "./helpers/querystring.js";
import { mediaImagePreviewResponseSchema } from "./media.js";

const aiMaxBase64ImageLength = 8_000_000;
const aiImageDetailSchema = z.enum(["low", "high", "auto"]).default("low");
const mediaModelIdSchema = z.string().trim().min(1).max(200);
//* Open strings accept new model options without a CMS update.
export const mediaImageOptionSchema = z.string().trim().min(1).max(20);
export const mediaImageAspectRatioSchema = z
	.string()
	.regex(/^(auto|\d+(\.\d+)?:\d+(\.\d+)?)$/, {
		error: "Aspect ratio must be auto or a width:height ratio.",
	});

const mediaImageGenerationSchema = z
	.object({
		model: mediaModelIdSchema.optional().meta({
			description: "The image model. Defaults to the configured default.",
		}),
		aspectRatio: mediaImageAspectRatioSchema
			.default("1:1")
			.meta({ description: "The image's shape, such as 16:9, or auto." }),
		resolution: mediaImageOptionSchema.optional().meta({
			description:
				"A resolution the model offers, such as 2K. Defaults to the model's own.",
		}),
		quality: mediaImageOptionSchema.optional().meta({
			description: "A quality the model offers. Defaults to the model's own.",
		}),
		outputFormat: mediaImageOptionSchema.optional().meta({
			description:
				"A file format the model offers. Defaults to the model's own.",
		}),
	})
	.strict()
	.default({ aspectRatio: "1:1" });

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
			})
			.nullable(),
	})
	.strict();

const mediaGenerationTypeSchema = z.enum(
	mediaGenerationTypes,
) satisfies z.ZodType<MediaGenerationType>;

const mediaGenerateFeatureSchema = z.union([
	z
		.object({
			key: z.literal("media.image.generate"),
			version: z.literal("v1"),
		})
		.strict(),
	z
		.object({
			key: z.literal("media.audio.generate"),
			version: z.literal("v1"),
		})
		.strict(),
]);

const mediaGenerateResponseSchema = cmsAiGenerateAcceptedDataSchema.extend({
	type: mediaGenerationTypeSchema,
	feature: mediaGenerateFeatureSchema,
});

const mediaGenerateCompletedSchema = cmsAiGenerateCompletedDataSchema
	.omit({ output: true })
	.extend({ feature: mediaGenerateFeatureSchema });

const mediaGenerateCompletionResponseSchema = z.discriminatedUnion("type", [
	mediaGenerateCompletedSchema.extend({
		type: z.literal("image"),
		output: cmsAiMediaOutputSchemas.image,
	}),
	mediaGenerateCompletedSchema.extend({
		type: z.literal("audio"),
		output: cmsAiMediaOutputSchemas.audio,
	}),
]);

const mediaGenerationRequestParamsSchema = z
	.object({
		requestId: z.uuid(),
	})
	.strict();

export const aiUsageChartDateSchema = z
	.string()
	.trim()
	.regex(/^\d{4}-\d{2}-\d{2}$/);

const aiUsageChartDimensionSchema = z.enum(["day"]);
export const aiUsageChartMetricSchema = z.enum([
	"requests",
	"totalTokens",
	"credits",
]);

export const aiUsageFeatureKeySchema = z.enum([
	"agent.chat",
	"agent.compact",
	"agent.title.generate",
	"web.search",
	"web.fetch",
	"media.analyze",
	"media.alt.generate",
	"media.image.generate",
	"media.audio.generate",
]) satisfies z.ZodType<AiUsageFeatureKey>;

export const aiUsageSessionTypeSchema = z.enum([
	"agent",
	"media-image",
	"media-audio",
	"media-alt",
]) satisfies z.ZodType<AiUsageSessionType>;

const aiUsageTokensResponseSchema = z
	.object({
		input: z.number().int().nonnegative(),
		output: z.number().int().nonnegative(),
		total: z.number().int().nonnegative(),
	})
	.strict();

const aiUsageSessionResponseSchema = z
	.object({
		type: aiUsageSessionTypeSchema,
		id: z.string(),
		conversation: z
			.object({
				id: z.string(),
				title: z.string(),
			})
			.strict()
			.nullable(),
		user: z
			.object({
				id: z.number(),
				username: z.string(),
				email: z.email(),
				firstName: z.string().nullable(),
				lastName: z.string().nullable(),
				profilePicture: mediaImagePreviewResponseSchema.nullable(),
			})
			.strict()
			.nullable(),
		credits: z.number().int().nonnegative(),
		tokens: aiUsageTokensResponseSchema,
		requests: z
			.object({
				total: z.number().int().nonnegative(),
				webSearches: z.number().int().nonnegative(),
				webFetches: z.number().int().nonnegative(),
				failed: z.number().int().nonnegative(),
				pending: z.number().int().nonnegative(),
			})
			.strict(),
		startedAt: z.string().nullable(),
		lastActivityAt: z.string().nullable(),
	})
	.strict() satisfies z.ZodType<AiUsageSession>;

const aiUsageRecordResponseSchema = z
	.object({
		id: z.number(),
		requestId: z.string(),
		providerRequestId: z.string().nullable(),
		feature: z
			.object({
				key: z.string(),
				version: z.string(),
			})
			.strict(),
		status: z.enum(["failed", "pending", "success"]),
		runId: z.string().nullable(),
		usage: z
			.discriminatedUnion("kind", [
				z
					.object({
						kind: z.literal("model"),
						model: z.string(),
						tokens: aiUsageTokensResponseSchema,
					})
					.strict(),
				z
					.object({
						kind: z.literal("web"),
						operation: z.enum(["search", "fetch"]),
						requests: z.number().int().positive(),
					})
					.strict(),
			])
			.nullable(),
		credits: z.number().int().nonnegative().nullable(),
		durationMs: z.number().nullable(),
		errorMessage: z.string().nullable(),
		createdAt: z.string().nullable(),
	})
	.strict() satisfies z.ZodType<AiUsageRecord>;

const aiUsageSessionParamsSchema = z
	.object({
		type: aiUsageSessionTypeSchema,
		id: z.string().trim().min(1).max(128),
	})
	.strict();

const aiCreditsBalanceSchema = z
	.object({
		used: z.number().nonnegative(),
		remaining: z.number().nonnegative(),
		resetsAt: z.string(),
	})
	.strict();

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
								"Comma-separated usage metrics to aggregate. Supported values are requests, totalTokens, and credits.",
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
					"filter[userId]": z.coerce.number().int().positive().optional().meta({
						description: "Only counts usage by this user.",
						example: 1,
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
				totals: z
					.object({
						credits: z.number().nonnegative(),
						totalTokens: z.number().nonnegative(),
						requests: z.number().int().nonnegative(),
						sessions: z.number().int().nonnegative(),
					})
					.strict(),
			})
			.strict(),
	} satisfies ControllerSchema,
	getUsageSessions: {
		body: undefined,
		query: {
			string: z
				.object({
					"filter[sessionType]": queryString.schema.filter(true, {
						example: "agent",
					}),
					"filter[userId]": queryString.schema.filter(true, {
						example: "1",
					}),
					"filter[requestId]": queryString.schema.filter(false, {
						description: "Finds the session a request belongs to.",
						example: "3f2b8c1e-5d4a-4f7b-9c2e-1a6d8e0b4f3c",
					}),
					sort: queryString.schema.sort("lastActivityAt,credits,totalTokens"),
					page: queryString.schema.page,
					perPage: queryString.schema.perPage,
				})
				.meta(queryString.meta),
			formatted: z.object({
				filter: z
					.object({
						sessionType: queryFormatted.schema.filters.union.optional(),
						userId: queryFormatted.schema.filters.union.optional(),
						requestId: queryFormatted.schema.filters.single.optional(),
					})
					.optional(),
				filterOr: queryFormatted.schema.filterOr,
				sort: z
					.array(
						z.object({
							key: z.enum(["lastActivityAt", "credits", "totalTokens"]),
							direction: z.enum(["asc", "desc"]),
						}),
					)
					.optional(),
				page: queryFormatted.schema.page,
				perPage: queryFormatted.schema.perPage,
			}),
		},
		params: undefined,
		response: z.array(aiUsageSessionResponseSchema),
	} satisfies ControllerSchema,
	getUsageSession: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: aiUsageSessionParamsSchema,
		response: aiUsageSessionResponseSchema,
	} satisfies ControllerSchema,
	getUsageSessionRecords: {
		body: undefined,
		query: {
			string: z
				.object({
					sort: queryString.schema.sort("createdAt"),
					page: queryString.schema.page,
					perPage: queryString.schema.perPage,
				})
				.meta(queryString.meta),
			formatted: z.object({
				sort: z
					.array(
						z.object({
							key: z.enum(["createdAt"]),
							direction: z.enum(["asc", "desc"]),
						}),
					)
					.optional(),
				page: queryFormatted.schema.page,
				perPage: queryFormatted.schema.perPage,
			}),
		},
		params: aiUsageSessionParamsSchema,
		response: z.array(aiUsageRecordResponseSchema),
	} satisfies ControllerSchema,
	getCredits: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: undefined,
		response: z
			.object({
				available: z.number().nonnegative(),
				allowance: aiCreditsBalanceSchema
					.extend({ total: z.number().nonnegative() })
					.nullable(),
				additional: z.object({ remaining: z.number().nonnegative() }).strict(),
				connectionCap: aiCreditsBalanceSchema
					.extend({ limit: z.number().nonnegative() })
					.nullable(),
			})
			.strict() satisfies z.ZodType<AiCredits>,
	} satisfies ControllerSchema,
	mediaAlt: {
		body: z
			.object({
				/** Groups attempts made together, such as regenerating until the result fits. */
				sessionId: z.uuid().optional(),
				instruction: z.string().trim().min(1).max(8_000).optional(),
				previousResponses: z
					.array(
						z
							.object({
								instruction: z.string().trim().min(1).max(8_000).optional(),
								output: generatedContentSchema(z.string()),
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
							.union([
								z.string(),
								z.record(z.string().trim().min(2).max(32), z.string()),
							])
							.optional(),
						alt: z
							.union([
								z.string(),
								z.record(z.string().trim().min(2).max(32), z.string()),
							])
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
		response: cmsAiGenerateCompletedDataSchema.extend({
			feature: z
				.object({
					key: z.literal("media.alt.generate"),
					version: z.literal("v1"),
				})
				.strict(),
			output: generatedContentSchema(z.string()),
		}),
	} satisfies ControllerSchema,
	getMediaModels: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: z.object({ type: mediaGenerationTypeSchema }).strict(),
		response: z.object({
			default: z.string(),
			models: z.array(
				z.union([
					mediaModelCatalogSchemas.image.shape.models.element,
					mediaModelCatalogSchemas.audio.shape.models.element,
				]),
			),
		}),
	} satisfies ControllerSchema,
	mediaImageGenerate: {
		body: z
			.object({
				/** Groups attempts made together, such as regenerating until the result fits. */
				sessionId: z.uuid().optional(),
				instruction: z.string().trim().min(1).max(8_000),
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
		response: mediaGenerateResponseSchema,
	} satisfies ControllerSchema,
	mediaAudioGenerate: {
		body: z
			.object({
				/** Groups attempts made together, such as regenerating until the result fits. */
				sessionId: z.uuid().optional(),
				script: z
					.string()
					.trim()
					.min(1)
					.max(constants.media.transcriptMaxLength)
					.meta({
						description: "The text to speak.",
					}),
				instruction: z.string().trim().min(1).max(2_000).optional().meta({
					description:
						"Delivery instructions, such as tone and pacing, for models that take them.",
				}),
				generation: z
					.object({
						model: mediaModelIdSchema.optional().meta({
							description:
								"The speech model. Defaults to the configured default.",
						}),
						voice: z.string().trim().min(1).max(200).optional().meta({
							description: "The voice. Defaults to the model's default voice.",
						}),
					})
					.strict()
					.default({}),
			})
			.strict(),
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: undefined,
		response: mediaGenerateResponseSchema,
	} satisfies ControllerSchema,
	mediaCompletion: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: mediaGenerationRequestParamsSchema,
		response: z.union([
			mediaGenerateResponseSchema,
			mediaGenerateCompletionResponseSchema,
		]),
	} satisfies ControllerSchema,
	mediaSave: {
		body: z
			.object({
				public: z.boolean().meta({
					description:
						"Store the file under a public key. Match the media it will create.",
				}),
				temporary: z.boolean().optional().meta({
					description:
						"Store the file under a temporary key, for replacing an existing media item's file.",
				}),
			})
			.strict(),
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: mediaGenerationRequestParamsSchema,
		response: z.object({
			key: z.string(),
			fileName: z.string(),
			mimeType: z.string(),
			size: z.number().int().nonnegative(),
		}) satisfies z.ZodType<SavedGeneratedMedia>,
	} satisfies ControllerSchema,
	mediaStream: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: z
			.object({
				//* Restrict this proxy to generated media storage keys.
				key: z
					.string()
					.regex(/^generated-media\/[0-9a-f-]{36}\.(webp|png|jpe?g|mp3|wav)$/),
			})
			.strict(),
		response: undefined,
	} satisfies ControllerSchema,
};

export type MediaAltBody = z.infer<typeof controllerSchemas.mediaAlt.body>;
export type MediaImageGenerateBody = z.infer<
	typeof controllerSchemas.mediaImageGenerate.body
>;
export type MediaAudioGenerateBody = z.infer<
	typeof controllerSchemas.mediaAudioGenerate.body
>;
export type GetUsageChartQueryParams = z.infer<
	typeof controllerSchemas.getUsageChart.query.string
>;
export type GetUsageSessionsQueryParams = z.infer<
	typeof controllerSchemas.getUsageSessions.query.formatted
>;
export type GetUsageSessionRecordsQueryParams = z.infer<
	typeof controllerSchemas.getUsageSessionRecords.query.formatted
>;
