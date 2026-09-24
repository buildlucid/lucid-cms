import z from "zod";
import {
	paginationInput,
	paginationSchema,
} from "../../../../libs/tools/pagination.js";
import { collectionLocalizationSchema } from "../schema.js";

export const inputSchema = z.object({
	collectionKey: z.string().trim().min(1),
	...paginationInput,
});

export const fieldOwnerSchema = z.enum([
	"document",
	"fixed",
	"builder",
	"embedded",
]);

const fieldEntrySchema = z.object({
	kind: z.literal("field"),
	owner: fieldOwnerSchema.meta({
		description: "Document or brick family containing this field.",
	}),
	brickKey: z
		.string()
		.nullable()
		.meta({ description: "Owning brick key, or null for document fields." }),
	path: z.array(z.string()).meta({
		description: "Field keys from the document or brick root to this field.",
	}),
	fieldType: z.string().meta({ description: "Lucid custom-field type." }),
	label: z
		.string()
		.meta({ description: "Editor label in the current interface language." }),
	description: z.string().nullable().meta({ description: "Editor help text." }),
	localized: z
		.boolean()
		.meta({ description: "Whether this field stores per-language values." }),
	constraints: z
		.object({
			required: z.boolean().optional(),
			min: z.number().optional(),
			max: z.number().optional(),
			step: z.number().optional(),
			minGroups: z.number().optional(),
			maxGroups: z.number().optional(),
			mediaType: z.string().optional(),
			extensions: z.array(z.string()).optional(),
		})
		.meta({ description: "Applicable value constraints." }),
	relationCollections: z
		.array(z.string())
		.meta({ description: "Readable related collection keys." }),
	multiple: z.boolean().optional().meta({
		description:
			"Whether the field accepts multiple relations, when applicable.",
	}),
	optionCount: z.number().meta({
		description: "Number of selectable options, listed as separate entries.",
	}),
});

export const entrySchema = z.discriminatedUnion("kind", [
	fieldEntrySchema,
	z.object({
		kind: z.literal("brick"),
		brickType: z
			.enum(["fixed", "builder", "embedded"])
			.meta({ description: "How the brick participates in documents." }),
		key: z.string().meta({ description: "Brick key." }),
		label: z
			.string()
			.meta({ description: "Editor label in the current interface language." }),
		description: z
			.string()
			.nullable()
			.meta({ description: "Editor help text." }),
	}),
	z.object({
		kind: z.literal("option"),
		owner: fieldOwnerSchema.meta({
			description: "Document or brick family containing the select field.",
		}),
		brickKey: z
			.string()
			.nullable()
			.meta({ description: "Owning brick key, when applicable." }),
		fieldPath: z
			.array(z.string())
			.meta({ description: "Path to the select field." }),
		value: z.string().meta({ description: "Stored option value." }),
		label: z.string().meta({ description: "Displayed option label." }),
	}),
	z.object({
		kind: z.literal("publishingTarget"),
		key: z
			.string()
			.meta({ description: "Version target accepted by document tools." }),
		label: z.string().meta({ description: "Publishing target label." }),
		requires: z.array(z.string()).meta({
			description:
				"Other target keys required before publishing to this target.",
		}),
	}),
]);

export const outputSchema = z.object({
	data: z.array(entrySchema).meta({
		description: "One page of fields, bricks, options and publishing targets.",
	}),
	pagination: paginationSchema,
	meta: z
		.object({
			collection: z
				.object({
					key: z
						.string()
						.meta({ description: "Collection key for document tools." }),
					mode: z
						.enum(["single", "multiple"])
						.meta({ description: "Document count mode." }),
					label: z.string().meta({
						description: "Collection name in the current interface language.",
					}),
					description: z
						.string()
						.nullable()
						.meta({ description: "Editor help text." }),
					routing: z
						.object({ field: z.string(), valueMeaning: z.string() })
						.nullable()
						.meta({ description: "Routing field and full-path semantics." }),
					localization: collectionLocalizationSchema,
					publishing: z
						.object({ targetCount: z.number() })
						.meta({ description: "Configured publishing target count." }),
				})
				.meta({ description: "Collection identity and content settings." }),
		})
		.meta({ description: "Context for interpreting description entries." }),
});
