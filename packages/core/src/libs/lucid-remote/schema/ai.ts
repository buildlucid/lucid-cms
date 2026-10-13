import z from "zod";
import type {
	MediaGenerationModelCatalog,
	MediaGenerationType,
} from "../../../types/response.js";

/** Lucid charges whole credits, so they can be stored and summed as integers. */
export const aiCreditsChargedSchema = z
	.string()
	.max(15)
	.regex(/^(0|[1-9]\d*)$/);

export const cmsAiUsageSchema = z
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
				creditsCharged: aiCreditsChargedSchema,
			})
			.strict(),
	})
	.strict();

const cmsAiFeatureSchema = z
	.object({
		key: z.string().min(1),
		version: z.string().min(1),
	})
	.strict();

export const cmsAiGenerateCompletedDataSchema = z
	.object({
		mode: z.enum(["sync", "async"]),
		status: z.literal("complete").optional(),
		requestId: z.string().min(1),
		feature: cmsAiFeatureSchema,
		output: z.record(z.string(), z.unknown()),
		usage: cmsAiUsageSchema,
	})
	.strict();

export const cmsAiGenerateAcceptedDataSchema = z
	.object({
		mode: z.literal("async"),
		requestId: z.string().min(1),
		feature: cmsAiFeatureSchema,
		status: z.enum(["queued", "processing"]),
	})
	.strict();

const cmsAiMediaFileSchema = z.object({
	id: z.string(),
	url: z.string(),
	storageKey: z.string(),
	byteSize: z.number().int().nonnegative(),
	mimeType: z.string(),
	extension: z.string(),
});

/** Stored media metadata returned by the Lucid service, for each media type. */
export const cmsAiMediaOutputSchemas = {
	image: cmsAiMediaFileSchema
		.extend({
			aspectRatio: z.string(),
			resolution: z.string().nullable(),
			quality: z.string().nullable(),
		})
		.strict(),
	audio: cmsAiMediaFileSchema
		.extend({
			voice: z.string(),
			characters: z.number().int().nonnegative(),
		})
		.strict(),
} satisfies Record<MediaGenerationType, z.ZodType>;

const mediaGenerationModelSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	description: z.string().default(""),
});

/** Media model catalogues with open-string options that accept new values without CMS updates. */
export const mediaGenerationModelCatalogSchemas = {
	image: z.object({
		default: z.string(),
		models: z.array(
			mediaGenerationModelSchema.extend({
				aspectRatios: z.array(z.string()),
				resolutions: z.array(z.string()),
				qualities: z.array(z.string()),
				outputFormats: z.array(z.string()),
				sourceImage: z.boolean(),
			}),
		),
	}),
	audio: z.object({
		default: z.string(),
		models: z.array(
			mediaGenerationModelSchema.extend({
				format: z.string(),
				voices: z.array(
					z.object({
						id: z.string(),
						name: z.string(),
						language: z.string().optional(),
						previewUrl: z.url(),
					}),
				),
				defaultVoice: z.string(),
				instructions: z.boolean(),
				maxCharacters: z.number().int().positive(),
			}),
		),
	}),
} satisfies {
	[Type in MediaGenerationType]: z.ZodType<MediaGenerationModelCatalog<Type>>;
};

/** Web usage is read leniently, so the website can add fields without breaking deployed CMS versions. */
export const cmsWebUsageSchema = z.object({
	kind: z.literal("web"),
	operation: z.enum(["search", "fetch"]),
	provider: z.string().min(1),
	requests: z.number().int().positive(),
	model: z.null(),
	tokens: z.null(),
	providerRequestId: z.string().min(1),
	cost: z.object({ creditsCharged: aiCreditsChargedSchema }),
});

export const cmsAgentUsageSchema = z.union([
	cmsAiUsageSchema,
	cmsWebUsageSchema,
]);

/**
 * Completed web requests with operation-specific output and lenient usage parsing.
 * @remarks Callers parse the output for their operation.
 */
const cmsWebCompletedDataSchema = z.object({
	mode: z.literal("sync"),
	status: z.literal("complete").optional(),
	requestId: z.string().min(1),
	feature: cmsAiFeatureSchema,
	output: z.record(z.string(), z.unknown()),
	usage: cmsWebUsageSchema,
});

export const cmsAiGenerateDataSchema = z.union([
	cmsAiGenerateCompletedDataSchema,
	cmsWebCompletedDataSchema,
	cmsAiGenerateAcceptedDataSchema,
]);

const cmsAiResponseEnvelopeSchema = z
	.object({
		data: cmsAiGenerateDataSchema,
	})
	.passthrough();

export type CmsAiGenerateCompletedData = z.infer<
	typeof cmsAiGenerateCompletedDataSchema
>;
export type CmsAiGenerateAcceptedData = z.infer<
	typeof cmsAiGenerateAcceptedDataSchema
>;
export type CmsAiGenerateData = z.infer<typeof cmsAiGenerateDataSchema>;

/**
 * Validates Website-owned AI data before it can affect CMS output or billing
 * records, including request/feature correlation for polling responses.
 */
export const parseCmsAiRemoteData = (
	value: unknown,
	expected: {
		feature: {
			key: string;
			version: string;
		};
		requestId?: string;
	},
): CmsAiGenerateData | null => {
	const parsed = cmsAiResponseEnvelopeSchema.safeParse(value);
	if (!parsed.success) return null;

	const data = parsed.data.data;
	if (
		data.feature.key !== expected.feature.key ||
		data.feature.version !== expected.feature.version ||
		(expected.requestId !== undefined && data.requestId !== expected.requestId)
	) {
		return null;
	}
	return data;
};
