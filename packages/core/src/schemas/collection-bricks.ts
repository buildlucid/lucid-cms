import z from "zod";
import { FieldConfigSchema, FieldInputSchema } from "./collection-fields.js";
import { stringTranslations } from "./locales.js";

export const BrickInputSchema = z.interface({
	ref: z.string(),
	key: z.string(),
	order: z.number(),
	type: z.union([z.literal("builder"), z.literal("fixed")]),
	"open?": z.boolean(),
	"fields?": z.array(FieldInputSchema).optional(),
});
export type BrickInputSchema = z.infer<typeof BrickInputSchema>;

export const BrickConfigSchema = z.interface({
	key: z.string().min(1).meta({
		description: "Unique identifier for the brick",
		example: "banner",
	}),
	details: z.object({
		name: stringTranslations.meta({
			description: "Display name for the brick",
			example: { en: "Banner" },
		}),
		summary: stringTranslations
			.nullable()
			.meta({
				description: "Description text for the brick",
				example: "A banner with a title and intro text",
			})
			.optional(),
	}),
	preview: z.object({
		image: z
			.string()
			.nullable()
			.meta({
				description: "Preview image URL for the brick",
				example: "https://example.com/banner-brick.png",
			})
			.optional(),
	}),
	get fields() {
		return z.array(FieldConfigSchema);
	},
});
