import z from "zod/v4";
import { stringTranslations } from "./locales.js";

export const fieldInputSchema = z.object({
	key: z.string(),
	type: z.union([
		z.literal("text"),
		z.literal("wysiwyg"),
		z.literal("media"),
		z.literal("number"),
		z.literal("checkbox"),
		z.literal("select"),
		z.literal("textarea"),
		z.literal("json"),
		z.literal("color"),
		z.literal("datetime"),
		z.literal("link"),
		z.literal("repeater"),
		z.literal("user"),
		z.literal("document"),
	]),
	translations: z.record(z.string(), z.any()).optional(),
	value: z.any().optional(),

	get groups() {
		return z
			.array(
				z.object({
					ref: z.string(),
					order: z.number().optional(),
					open: z.boolean().optional(),
					get fields() {
						return z.array(fieldInputSchema);
					},
				}),
			)
			.optional();
	},
});
export type FieldInputSchema = z.infer<typeof fieldInputSchema>;

export const fieldConfigSchema = z.object({
	key: z.string().meta({
		description: "Unique identifier for the field",
		example: "pageTitle",
	}),
	type: z.string().meta({
		description: "Type of the field (text, checkbox, media, etc.)",
		example: "text",
	}),
	collection: z
		.string()
		.nullable()
		.meta({
			description: "Collection key for document reference fields",
			example: "page",
		})
		.optional(),
	details: z.object({
		label: stringTranslations
			.meta({
				description: "Display label for the field",
				example: { en: "Page title" },
			})
			.optional(),
		summary: stringTranslations
			.meta({
				description: "Description text for the field",
				example: "The title of the page.",
			})
			.optional(),
		placeholder: stringTranslations
			.meta({
				description: "Placeholder text for input fields",
				example: "Enter page title...",
			})
			.optional(),
		true: stringTranslations
			.meta({
				description: "Label for true value in boolean fields",
				example: "Yes",
			})
			.optional(),
		false: stringTranslations
			.meta({
				description: "Label for false value in boolean fields",
				example: "No",
			})
			.optional(),
	}),
	config: z
		.object({
			useTranslations: z
				.boolean()
				.meta({
					description: "Whether the field supports translations",
					example: true,
				})
				.nullable()
				.optional(),
			isHidden: z
				.boolean()
				.meta({
					description: "Whether the field is hidden in the UI",
					example: false,
				})
				.nullable()
				.optional(),
			isDisabled: z
				.boolean()
				.meta({
					description: "Whether the field is disabled for editing",
					example: false,
				})
				.nullable()
				.optional(),
			default: z
				.any()
				.meta({
					description: "Default value for the field",
					example: "Welcome to our website",
				})
				.nullable()
				.optional(),
		})
		.optional(),
	validation: z
		.object({
			required: z
				.boolean()
				.nullable()
				.meta({
					description: "Whether the field is required",
					example: true,
				})
				.optional(),
			zod: z
				.any()
				.nullable()
				.meta({
					description: "Custom Zod validation schema for the field",
					example: "z.string().min(2).max(128)",
				})
				.optional(),
			type: z
				.string()
				.nullable()
				.meta({
					description: "Media type constraint for media fields",
					example: "image",
				})
				.optional(),
			maxGroups: z
				.number()
				.nullable()
				.meta({
					description: "Maximum groups allowed in a repeater",
					example: 3,
				})
				.optional(),
			minGroups: z
				.number()
				.nullable()
				.meta({
					description: "Minimum groups required in a repeater",
					example: 1,
				})
				.optional(),
			extensions: z
				.array(z.string())
				.nullable()
				.meta({
					description: "Allowed file extensions for media fields",
					example: ["jpg", "png", "webp"],
				})
				.optional(),
			width: z
				.object({
					min: z.number().nullable().meta({
						description: "Minimum width for media",
						example: 800,
					}),
					max: z.number().nullable().meta({
						description: "Maximum width for media",
						example: 1920,
					}),
				})
				.optional()
				.nullable(),
			height: z
				.object({
					min: z.number().nullable().meta({
						description: "Minimum height for media",
						example: 600,
					}),
					max: z.number().nullable().meta({
						description: "Maximum height for media",
						example: 1080,
					}),
				})
				.optional()
				.nullable(),
		})
		.optional(),
	fields: z
		.any()
		.meta({
			description: "Nested fields for repeater or tab field types",
			example: [],
		})
		.optional(),
	options: z
		.array(
			z.object({
				label: stringTranslations.meta({
					description: "Display label for the option",
					example: { en: "Option A" },
				}),
				value: z.string().meta({
					description: "Value of the option when selected",
					example: "option_a",
				}),
			}),
		)
		.nullable()
		.meta({
			description: "Options for select field types",
			example: [{ label: { en: "Option A" }, value: "option_a" }],
		})
		.optional(),
	presets: z
		.array(z.string())
		.nullable()
		.meta({
			description: "Preset values for color fields",
			example: ["#ff0000", "#00ff00", "#0000ff"],
		})
		.optional(),
});

export const groupResponseBaseSchema = z.object({
	ref: z.string().meta({
		description: "Unique reference for this field group",
		example: "3243243",
	}),
	order: z.number().meta({
		description: "The order/position of this group in its parent",
		example: 0,
	}),
	open: z.boolean().meta({
		description: "Whether this group is expanded in the UI",
		example: true,
	}),
});
export const groupResponseSchema = groupResponseBaseSchema.extend({
	get fields() {
		return z.array(z.any());
	},
});
export const groupClientResponseSchema = groupResponseBaseSchema.extend({
	get fields() {
		return z.record(z.any(), z.any());
	},
});

export const fieldResponseBaseSchema = z.object({
	key: z.string().meta({
		description: "The fields key",
		example: "pageTitle",
	}),
	type: z.string().meta({
		description: "The type of field (e.g., text, number, media)",
		example: "text",
	}),
	groupRef: z
		.string()
		.meta({
			description:
				"Reference to the group this field belongs to, if applicable",
			example: "3243243",
		})
		.optional(),
	translations: z
		.record(z.any(), z.any())
		.meta({
			description: "Translations of the field value for different locales",
			example: {
				en: "Welcome to our website",
				fr: "Bienvenue sur notre site web",
			},
		})
		.optional(),
	value: z
		.any()
		.meta({
			description: "The value of the field",
			example: "Welcome to our website",
		})
		.optional(),
});
export const fieldResponseSchema = fieldResponseBaseSchema.extend({
	get groups() {
		return z.array(groupResponseSchema);
	},
});
export const fieldClientResponseSchema = fieldResponseBaseSchema.extend({
	get groups() {
		return z.array(groupClientResponseSchema);
	},
});
