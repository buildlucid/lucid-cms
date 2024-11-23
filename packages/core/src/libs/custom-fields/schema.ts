import z from "zod";
import { stringTranslations } from "../../schemas/locales.js";

// TODO: test this through lucid.config.* - have a feeling it isnt being used properly
const CustomFieldSchema = z.object({
	type: z.string(),
	key: z.string(),
	collection: z.string().optional(),
	details: z
		.object({
			label: stringTranslations.optional(),
			summary: stringTranslations.optional(),
			true: stringTranslations.optional(),
			false: stringTranslations.optional(),
		})
		.optional(),
	config: z
		.object({
			default: z
				.union([
					z.boolean(),
					z.string(),
					z.number(),
					z.undefined(),
					z.object({}),
					z.null(),
				])
				.optional(),
			useTranslations: z.boolean().optional(),
			isHidden: z.boolean().optional(),
			isDisabled: z.boolean().optional(),
		})
		.optional(),
	options: z
		.array(
			z.object({
				label: stringTranslations,
				value: z.string(),
			}),
		)
		.optional(),
	presets: z.array(z.string()).optional(),
	validation: z
		.object({
			zod: z.any().optional(),
			required: z.boolean().optional(),
			extensions: z.array(z.string()).optional(),
			width: z
				.object({
					min: z.number().optional(),
					max: z.number().optional(),
				})
				.optional(),
			height: z
				.object({
					min: z.number().optional(),
					max: z.number().optional(),
				})
				.optional(),
		})
		.optional(),
});

export default CustomFieldSchema;
