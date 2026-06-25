import z from "zod";
import constants from "../../../constants/constants.js";
import { adminCopyInputSchema } from "../../i18n/index.js";

// TODO: test this through lucid.config.* - have a feeling it isnt being used properly
const CustomFieldSchema = z.object({
	type: z.string(),
	key: z
		.string()
		.refine((val) => !val.includes(constants.db.nameSeparator), {
			message: `Field key cannot contain '${constants.db.nameSeparator}'`,
		})
		.refine((val) => !val.startsWith(constants.db.generatedColumnPrefix), {
			message: `Field key cannot start with a '${constants.db.generatedColumnPrefix}' prefix`,
		}),
	collection: z.union([z.string(), z.array(z.string())]).optional(),
	details: z
		.object({
			label: adminCopyInputSchema.optional(),
			summary: adminCopyInputSchema.optional(),
			true: adminCopyInputSchema.optional(),
			false: adminCopyInputSchema.optional(),
		})
		.optional(),
	ai: z
		.object({
			enabled: z.boolean().optional(),
			instructions: z.string().optional(),
			guidance: z
				.array(
					z
						.object({
							key: z.string().trim().min(1),
							label: adminCopyInputSchema,
							instructions: z.string().trim().min(1),
						})
						.strict(),
				)
				.optional(),
			context: z.function().optional(),
		})
		.optional(),
	default: z
		.union([
			z.boolean(),
			z.string(),
			z.number(),
			z.undefined(),
			z.object({}),
			z.array(z.any()),
			z.null(),
		])
		.optional(),
	localized: z.boolean().optional(),
	time: z.boolean().optional(),
	multiple: z.boolean().optional(),
	index: z.literal(true).optional(),
	ui: z
		.object({
			hidden: z.boolean().optional(),
			disabled: z.boolean().optional(),
		})
		.optional(),
	options: z
		.array(
			z.object({
				label: adminCopyInputSchema,
				value: z.string(),
			}),
		)
		.optional(),
	presets: z.array(z.string()).optional(),
	validation: z
		.object({
			zod: z.any().optional(),
			required: z.boolean().optional(),
			minItems: z.number().optional(),
			maxItems: z.number().optional(),
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
			maxGroups: z.number().optional(),
			minGroups: z.number().optional(),
		})
		.optional(),
});

export default CustomFieldSchema;
