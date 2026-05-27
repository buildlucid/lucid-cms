import z from "zod";
import type { ControllerSchema } from "../types.js";

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
						input: z.number().int().nonnegative(),
						output: z.number().int().nonnegative(),
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
				locale: z
					.object({
						source: z.string().trim().min(2).max(32).optional(),
						target: z.array(z.string().trim().min(2).max(32)).min(1),
					})
					.strict(),
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
					key: z.literal("custom-field-input"),
					version: z.literal("v1"),
				})
				.strict(),
		}),
	} satisfies ControllerSchema,
};

export type CustomFieldInputBody = z.infer<
	typeof controllerSchemas.customFieldInput.body
>;
