import z from "zod";
import { resolvedAdminCopySchema } from "../libs/i18n/index.js";

export const fieldInputSchema = z.object({
	key: z.string(),
	type: z.union([
		z.literal("text"),
		z.literal("rich-text"),
		z.literal("media"),
		z.literal("number"),
		z.literal("checkbox"),
		z.literal("select"),
		z.literal("textarea"),
		z.literal("json"),
		z.literal("code"),
		z.literal("color"),
		z.literal("datetime"),
		z.literal("link"),
		z.literal("repeater"),
		z.literal("user"),
		z.literal("relation"),
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
		.union([z.string(), z.array(z.string())])
		.nullable()
		.meta({
			description: "Collection key for relation fields",
			example: ["page", "blog"],
		})
		.optional(),
	details: z.object({
		label: resolvedAdminCopySchema
			.meta({
				description: "Display label for the field",
				example: {
					type: "lucid.copy",
					scope: "admin",
					key: "collections.page.fields.pageTitle.label",
					defaultMessage: "Page title",
				},
			})
			.optional(),
		summary: resolvedAdminCopySchema
			.meta({
				description: "Description text for the field",
				example: {
					type: "lucid.copy",
					scope: "admin",
					key: "collections.page.fields.pageTitle.summary",
					defaultMessage: "The title of the page.",
				},
			})
			.optional(),
		placeholder: resolvedAdminCopySchema
			.meta({
				description: "Placeholder text for input fields",
				example: {
					type: "lucid.copy",
					scope: "admin",
					key: "collections.page.fields.pageTitle.placeholder",
					defaultMessage: "Enter page title...",
				},
			})
			.optional(),
		true: resolvedAdminCopySchema
			.meta({
				description: "Label for true value in boolean fields",
				example: {
					type: "lucid.copy",
					scope: "admin",
					key: "collections.page.fields.featured.trueLabel",
					defaultMessage: "Yes",
				},
			})
			.optional(),
		false: resolvedAdminCopySchema
			.meta({
				description: "Label for false value in boolean fields",
				example: {
					type: "lucid.copy",
					scope: "admin",
					key: "collections.page.fields.featured.falseLabel",
					defaultMessage: "No",
				},
			})
			.optional(),
	}),
	ai: z
		.object({
			enabled: z.boolean().meta({
				description: "Whether AI generation is enabled for this field",
				example: true,
			}),
			guidance: z.array(
				z.object({
					key: z.string().meta({
						description: "Unique key for the guidance option",
						example: "improve",
					}),
					label: resolvedAdminCopySchema.meta({
						description: "Display label for the guidance option",
						example: {
							type: "lucid.copy",
							scope: "admin",
							key: "core.ai.guidance.improve.label",
							defaultMessage: "Improve",
						},
					}),
				}),
			),
		})
		.optional(),
	localized: z
		.boolean()
		.meta({
			description: "Whether the field supports localized content",
			example: true,
		})
		.nullable()
		.optional(),
	time: z
		.boolean()
		.meta({
			description: "Whether datetime fields include time selection",
			example: true,
		})
		.nullable()
		.optional(),
	multiple: z
		.boolean()
		.meta({
			description:
				"Whether relation fields can store more than one related item",
			example: true,
		})
		.nullable()
		.optional(),
	index: z
		.literal(true)
		.meta({
			description: "Whether Lucid generates an index for the field",
			example: true,
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
	output: z
		.enum(["nested", "inline"])
		.meta({
			description:
				"How section/collapsible fields shape their children in client document responses",
			example: "nested",
		})
		.nullable()
		.optional(),
	defaultOpen: z
		.boolean()
		.meta({
			description: "Whether a collapsible renders expanded by default",
			example: false,
		})
		.nullable()
		.optional(),
	ui: z
		.object({
			hidden: z
				.boolean()
				.meta({
					description: "Whether the field is hidden in the UI",
					example: false,
				})
				.nullable()
				.optional(),
			width: z
				.union([
					z.literal(12),
					z.literal(8),
					z.literal(6),
					z.literal(4),
					z.literal(3),
				])
				.meta({
					description: "Admin layout width on a fixed 12-column grid",
					example: 6,
				})
				.nullable()
				.optional(),
			disabled: z
				.boolean()
				.meta({
					description: "Whether the field is disabled for editing",
					example: false,
				})
				.nullable()
				.optional(),
			condition: z
				.object({
					action: z
						.enum(["show", "hide"])
						.meta({
							description:
								"Whether matching the condition shows or hides the field",
							example: "show",
						})
						.optional(),
					translationScope: z
						.enum(["same", "default", "any"])
						.meta({
							description:
								"How localized target field values are resolved while evaluating the condition",
							example: "same",
						})
						.optional(),
					groups: z
						.array(
							z.array(
								z.object({
									field: z.string().meta({
										description:
											"Key of the sibling or ancestor-scope field the rule evaluates against",
										example: "menuType",
									}),
									operator: z
										.enum([
											"equals",
											"notEquals",
											"isEmpty",
											"isNotEmpty",
											"contains",
											"notContains",
										])
										.meta({
											description: "Comparison operator for the rule",
											example: "equals",
										}),
									value: z
										.union([z.string(), z.number(), z.boolean(), z.null()])
										.meta({
											description: "Value the rule compares against",
											example: "docs",
										})
										.optional(),
								}),
							),
						)
						.meta({
							description:
								"Condition rule groups. Groups are OR'd, rules within a group are AND'd",
						}),
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
				label: resolvedAdminCopySchema.meta({
					description: "Display label for the option",
					example: {
						type: "lucid.copy",
						scope: "admin",
						key: "collections.page.fields.status.options.draft.label",
						defaultMessage: "Draft",
					},
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
	languages: z
		.array(z.string())
		.nullable()
		.meta({
			description: "Language options for code fields",
			example: ["javascript", "typescript", "css"],
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
