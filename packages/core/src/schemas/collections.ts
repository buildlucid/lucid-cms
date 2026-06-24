import z from "zod";
import { resolvedAdminCopySchema } from "../libs/i18n/index.js";
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
	group: z
		.object({
			key: z.string().meta({
				description: "The collection group key",
				example: "content",
			}),
			name: resolvedAdminCopySchema.nullable().meta({
				description: "Display name for the collection group",
				example: {
					type: "lucid.copy",
					scope: "admin",
					key: "collections.groups.content.name",
					defaultMessage: "Content",
				},
			}),
			order: z.number().nullable().meta({
				description: "Optional order value for sorting collection groups",
				example: 10,
			}),
		})
		.nullable()
		.meta({
			description: "Admin navigation group metadata for the collection",
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
		name: resolvedAdminCopySchema.meta({
			description: "Display name for the collection",
			example: {
				type: "lucid.copy",
				scope: "admin",
				key: "collections.page.name",
				defaultMessage: "Pages",
			},
		}),
		singularName: resolvedAdminCopySchema.meta({
			description: "Singular display name for items in the collection",
			example: {
				type: "lucid.copy",
				scope: "admin",
				key: "collections.page.singularName",
				defaultMessage: "Page",
			},
		}),
		summary: resolvedAdminCopySchema.nullable().meta({
			description: "Description text for the collection",
			example: {
				type: "lucid.copy",
				scope: "admin",
				key: "collections.page.summary",
				defaultMessage: "Manage the pages and content on your website.",
			},
		}),
	}),
	config: z.object({
		localized: z.boolean().meta({
			description: "Whether the collection supports localized content",
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
		scheduling: z.boolean().meta({
			description: "Whether the collection has release scheduling enabled",
			example: false,
		}),
		revisionRetentionDays: z.union([z.number(), z.literal(false)]).meta({
			description:
				"Number of days to retain unprotected revisions, or false to retain indefinitely",
			example: 30,
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
						name: resolvedAdminCopySchema,
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
		listing: z.array(z.string()).meta({
			description: "Field keys included in the document listing columns",
			example: ["pageTitle", "author", "fullSlug", "slug"],
		}),
		environments: z.array(
			z.object({
				key: z.string().meta({
					description: "The environment key",
					example: "production",
				}),
				name: resolvedAdminCopySchema.meta({
					description: "Display name for the environment",
					example: {
						type: "lucid.copy",
						scope: "admin",
						key: "collections.page.environments.production.name",
						defaultMessage: "Production",
					},
				}),
				requires: z.array(z.string()).meta({
					description:
						"Environment keys that must match latest before releases can be created for this environment",
					example: ["staging"],
				}),
				permissions: z.object({
					publish: z.string().meta({
						description: "Permission required to publish to this environment",
						example: "documents:publish",
					}),
					review: z.string().optional().meta({
						description:
							"Permission required to review releases for this environment",
						example: "documents:review",
					}),
				}),
			}),
		),
	}),
	capabilities: z.object({
		scheduling: z.boolean().meta({
			description:
				"Whether this collection can create scheduled releases in the current runtime",
			example: false,
		}),
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
