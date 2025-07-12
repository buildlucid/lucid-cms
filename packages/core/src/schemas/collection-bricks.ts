import z from "zod/v4";
import {
	fieldClientResponseSchema,
	fieldConfigSchema,
	fieldInputSchema,
	fieldResponseSchema,
} from "./collection-fields.js";
import { stringTranslations } from "./locales.js";

export const brickInputSchema = z.object({
	id: z.number().nullable().optional(),
	ref: z.string(),
	key: z.string(),
	order: z.number(),
	type: z.union([z.literal("builder"), z.literal("fixed")]),
	open: z.boolean().optional(),
	fields: z.array(fieldInputSchema).optional(),
});
export type BrickInputSchema = z.infer<typeof brickInputSchema>;

export const brickConfigSchema = z.object({
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
		return z.array(fieldConfigSchema);
	},
});

export const brickResponseBaseSchema = z
	.object({
		id: z.number().meta({
			description: "The ID of the brick row",
			example: 1,
		}),
		key: z.string().meta({
			description: "The key that identifies the brick",
			example: "hero",
		}),
		ref: z.string().meta({
			description: "The unique reference identifier for this brick",
			example: "7645654",
		}),
		order: z.number().meta({
			description: "The position order of this brick in the document",
			example: 0,
		}),
		open: z.boolean().meta({
			description: "Whether this brick is expanded in the UI",
			example: true,
		}),
		type: z.enum(["builder", "fixed"]).meta({
			description: "The type of brick",
			example: "builder",
		}),
	})
	.meta({
		additionalProperties: true,
	});

export const brickResponseSchema = brickResponseBaseSchema.extend({
	get fields() {
		return z.array(fieldResponseSchema);
	},
});
export const brickClientResponseSchema = brickResponseBaseSchema.extend({
	get fields() {
		return z.record(z.any(), z.array(fieldClientResponseSchema));
	},
});
