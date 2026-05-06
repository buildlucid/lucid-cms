import z from "zod";
import type { ControllerSchema } from "../types.js";
import { brickConfigSchema } from "./collection-bricks.js";
import { fieldConfigSchema } from "./collection-fields.js";

const migrationStatusSchema = z.object({
	requiresMigration: z.boolean().meta({
		description: "Whether the collection requires a database migration",
		example: false,
	}),
	missingColumns: z.record(z.string(), z.array(z.string())).meta({
		description: "Columns that are missing from the database",
		example: {
			"document-fields": ["title"],
		},
	}),
	hiddenFields: z.record(z.string(), z.array(z.string())).meta({
		description: "Fields that are hidden from the collection",
		example: {
			banner: ["heading"],
		},
	}),
});

const collectionResponseSchema = z.object({
	key: z.string().meta({
		description: "The collection key",
		example: "page",
	}),
	mode: z.enum(["single", "multiple"]).meta({
		description:
			"Whether the collection has one document or multiple documents",
		example: "multiple",
	}),
	documentId: z
		.number()
		.nullable()
		.meta({
			description:
				'The document ID if the collection is mode "single" and had one created',
			example: 1,
		})
		.optional(),
	details: z.object({
		name: z.any().meta({
			description: "Display name for the collection",
			example: "Pages",
		}),
		singularName: z.any().meta({
			description: "Singular display name for items in the collection",
			example: { en: "Page" },
		}),
		summary: z.any().nullable().meta({
			description: "Description text for the collection",
			example: "Manage the pages and content on your website.",
		}),
	}),
	config: z.object({
		translations: z.boolean().meta({
			description: "Whether the collection supports translations",
			example: true,
		}),
		revisions: z.boolean().meta({
			description: "Whether the collection supports document revisions",
			example: true,
		}),
		autoSave: z.boolean().meta({
			description: "Whether the collection supports auto-save",
			example: true,
		}),
		locked: z.boolean().meta({
			description: "Whether the collection structure is locked from editing",
			example: false,
		}),
		review: z
			.object({
				requiredFor: z.array(z.string()),
				allowSelfApproval: z.boolean(),
				comments: z.object({
					request: z.enum(["required", "optional"]),
					decision: z.enum(["required", "optional"]),
				}),
			})
			.optional(),
		workflow: z
			.object({
				initial: z.string(),
				stages: z.array(
					z.object({
						key: z.string(),
						name: z.any(),
						color: z.enum(["grey", "red", "yellow", "green", "blue", "purple"]),
						publishTargets: z.array(z.string()),
						permissions: z.object({
							moveTo: z.string().optional(),
							moveFrom: z.string().optional(),
						}),
					}),
				),
			})
			.optional(),
		displayInListing: z.array(z.string()).meta({
			description: "Field keys to display in the document listing columns",
			example: ["pageTitle", "author", "fullSlug", "slug"],
		}),
		environments: z.array(
			z.object({
				key: z.string().meta({
					description: "The environment key",
					example: "production",
				}),
				name: z.any().meta({
					description: "Display name for the environment",
					example: { en: "Production" },
				}),
				permissions: z.object({
					publish: z.string().meta({
						description: "Permission required to publish to this environment",
						example: "documents:publish",
					}),
					review: z.string().optional().meta({
						description:
							"Permission required to review publish requests for this environment",
						example: "documents:review",
					}),
				}),
			}),
		),
	}),
	permissions: z.object({
		read: z.string(),
		create: z.string(),
		update: z.string(),
		delete: z.string(),
		restore: z.string(),
		publish: z.string(),
		review: z.string(),
	}),
	migrationStatus: migrationStatusSchema.nullable(),
	get fixedBricks() {
		return z
			.array(brickConfigSchema)
			.meta({
				description:
					"Fixed (non-movable) bricks for all documents in the collection",
				example: [],
			})
			.optional();
	},
	get builderBricks() {
		return z
			.array(brickConfigSchema)
			.meta({
				description:
					"Builder bricks that can be added to documents in the collection",
				example: [],
			})
			.optional();
	},
	get fields() {
		return z.array(fieldConfigSchema).meta({
			description: "Fields that make up documents in the collection",
			example: [],
		});
	},
});

export const controllerSchemas = {
	getSingle: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: z.object({
			key: z.string().meta({
				description: "The collection key",
				example: "page",
			}),
		}),
		response: collectionResponseSchema,
	} satisfies ControllerSchema,
	getAll: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: undefined,
		response: z.array(collectionResponseSchema),
	} satisfies ControllerSchema,
};
