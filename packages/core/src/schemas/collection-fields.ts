import z from "zod";
import { stringTranslations } from "./locales.js";

export const FieldInputSchema = z.interface({
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
		z.literal("colour"),
		z.literal("datetime"),
		z.literal("link"),
		z.literal("repeater"),
		z.literal("user"),
		z.literal("document"),
	]),
	"translations?": z.record(z.string(), z.any()),
	"value?": z.any(),

	get "groups?"() {
		return z
			.array(
				z.interface({
					ref: z.string(),
					order: z.number().optional(),
					open: z.boolean().optional(),
					get fields() {
						return z.array(FieldInputSchema);
					},
				}),
			)
			.optional();
	},
});
export type FieldInputSchema = z.infer<typeof FieldInputSchema>;

export const FieldConfigSchema = z.interface({
	key: z.string().meta({
		description: "Unique identifier for the field",
		example: "pageTitle",
	}),
	type: z.string().meta({
		description: "Type of the field (text, checkbox, media, etc.)",
		example: "text",
	}),
	"collection?": z.string().nullable().meta({
		description: "Collection key for document reference fields",
		example: "page",
	}),
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
	"config?": z.object({
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
	}),
	"validation?": z.object({
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
	}),
	"fields?": z.any().meta({
		description: "Nested fields for repeater or tab field types",
		example: [],
	}),
	"options?": z
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
		}),
	"presets?": z
		.array(z.string())
		.nullable()
		.meta({
			description: "Preset values for colour fields",
			example: ["#ff0000", "#00ff00", "#0000ff"],
		}),
});
