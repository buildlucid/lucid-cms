import z from "zod";

export const aiCreditsChargedSchema = z
	.string()
	.max(64)
	.regex(/^(0|[1-9]\d*)(\.\d+)?$/);

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
		output: z.unknown(),
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

export const cmsAiGenerateDataSchema = z.union([
	cmsAiGenerateCompletedDataSchema,
	cmsAiGenerateAcceptedDataSchema,
]);

const cmsAiResponseEnvelopeSchema = z
	.object({
		data: cmsAiGenerateDataSchema,
	})
	.passthrough();

export type CmsAiRemoteData = z.infer<typeof cmsAiGenerateDataSchema>;

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
): CmsAiRemoteData | null => {
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
