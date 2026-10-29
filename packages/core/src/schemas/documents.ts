import z from "zod";
import type { ControllerSchema } from "../exports/types.js";
import { brickInputSchema, brickResponseSchema } from "./collection-bricks.js";
import { fieldInputSchema, fieldResponseSchema } from "./collection-fields.js";
import {
	documentVersionResponseSchema,
	versionTypesSchema,
} from "./document-versions.js";
import { emailDeliveryStatusSchema } from "./email.js";
import { queryFormatted, queryString } from "./helpers/querystring.js";
import { mediaResponseSchema } from "./media.js";
import { agentActorSchema } from "./shared/agent-actor.js";
import {
	contentDepthSchema,
	contentFallbackLocaleSchema,
	contentLocaleSchema,
} from "./shared/content.js";
import { richTextJSONSchema } from "./shared/rich-text.js";
import { userDisplaySchema } from "./shared/user-display.js";

const previewTokenSchema = z.string().meta({
	description: "An opaque preview token",
});

const contentDocumentVersionSchema = z
	.string()
	.trim()
	.min(1)
	.refine((version) => version !== "revision" && version !== "snapshot", {
		message: "Revisions and snapshots can only be accessed through a preview.",
	})
	.meta({
		description: "Latest or a configured collection environment",
		example: "production",
	});

const documentResponseVersionSchema = z.object({
	id: z.number().nullable().meta({
		description: "The document version ID",
		example: 5,
	}),
	promotedFrom: z.number().nullable().meta({
		description: "The ID of the version this was promoted from, if applicable",
		example: 3,
	}),
	contentId: z.string().nullable().meta({
		description: "The content ID of the version",
		example: "123e4567-e89b-12d3-a456-426614174000",
	}),
	createdAt: z.string().nullable().meta({
		description: "The timestamp when this version was created",
		example: "2025-04-10T14:30:00Z",
	}),
	updatedAt: z.string().nullable().meta({
		description: "The timestamp when this version was last updated",
		example: "2025-04-10T15:45:00Z",
	}),
	createdBy: z.number().nullable().meta({
		description: "The ID of the user who created this version",
		example: 42,
	}),
	createdByRunId: z.string().nullable().meta({
		description:
			"The agent run that acted for createdBy, resolved through refs.agents",
	}),
});

const documentWorkflowSchema = z.object({
	stage: z.string(),
	assignees: z.array(
		z.object({
			id: z.number(),
			userId: z.number(),
			assignedBy: z.number().nullable(),
			assignedAt: z.string().nullable(),
		}),
	),
	createdAt: z.string().nullable(),
	updatedAt: z.string().nullable(),
	updatedBy: z.number().nullable(),
});

const documentRouteSchema = z
	.object({
		path: z.union([z.string(), z.record(z.string(), z.string().nullable())]),
		label: z.union([z.string(), z.record(z.string(), z.string())]),
	})
	.nullable();

/** Routes in content responses, read in one locale when the request has a `locale`. */
const contentDocumentRouteSchema = z.union([
	documentRouteSchema,
	z.object({
		path: z.string().nullable(),
		label: z.string().nullable(),
		alternates: z.record(z.string(), z.string().nullable()).meta({
			description: "Route paths keyed by locale, such as for language links",
		}),
	}),
]);

const contentDocumentLocaleSchema = z.string().nullable().optional().meta({
	description:
		"With a locale, the one fields were read in: the requested locale, or the collection's default when it doesn't have it",
});

const documentResponseBaseSchema = z.object({
	id: z.number().meta({
		description: "The document ID",
		example: 123,
	}),
	collectionKey: z.string().meta({
		description: "The key of the collection this document belongs to",
		example: "page",
	}),
	version: z.string().nullable().meta({
		description: "The current version of the document",
		example: "latest",
	}),
	versionId: z.number().nullable().meta({
		description: "The current version ID",
		example: 1,
	}),
	contentId: z.string().nullable().meta({
		description:
			"The current version's content ID, which changes whenever its content does",
		example: "4f7c2b1e-8a3d-4c5f-9e6a-1b2c3d4e5f60",
	}),
	route: documentRouteSchema.meta({
		description: "The resolved public route for this document",
	}),
	versions: z.record(z.string(), documentResponseVersionSchema.nullable()),
	isDeleted: z.boolean().meta({
		description: "Whether the document has been deleted",
		example: false,
	}),
	createRequestId: z.number().nullable().meta({
		description:
			"The open create request requesting this document. Null once the document is created",
		example: null,
	}),
	createdBy: z.number().nullable(),
	createdByRunId: z.string().nullable(),
	updatedBy: z.number().nullable(),
	updatedByRunId: z.string().nullable(),
	createdAt: z.string().nullable().meta({
		description: "The timestamp when this document was created",
		example: "2025-04-08T09:00:00Z",
	}),
	updatedAt: z.string().nullable().meta({
		description: "The timestamp when this document was last updated",
		example: "2025-04-10T15:45:00Z",
	}),
});

export const documentResponseSchema = documentResponseBaseSchema.extend({
	bricks: z.array(brickResponseSchema).nullable().optional(),
	fields: z.array(fieldResponseSchema).nullable().optional(),
	workflow: documentWorkflowSchema.nullable().optional(),
});

const documentRefResponseSchema = z.object({
	id: z.number(),
	versionId: z.number().optional(),
	collectionKey: z.string(),
	locale: contentDocumentLocaleSchema,
	route: contentDocumentRouteSchema,
	/** Admin responses retain field wrappers; content responses flatten them. */
	fields: z.record(z.string(), z.unknown()).nullable(),
});

const documentUserRefResponseSchema = userDisplaySchema.extend({
	email: z.email().optional().meta({
		description: "Only in admin responses; the content API leaves it out",
	}),
});

const documentEmailRefResponseSchema = z.object({
	id: z.number(),
	subject: z.string(),
	template: z.string(),
	from: z.object({
		address: z.string(),
		name: z.string(),
	}),
	to: z.string().optional().meta({
		description: "Only in admin responses; the content API leaves it out",
	}),
	cc: z.string().nullable().optional().meta({
		description: "Only in admin responses; the content API leaves it out",
	}),
	bcc: z.string().nullable().optional().meta({
		description: "Only in admin responses; the content API leaves it out",
	}),
	currentStatus: emailDeliveryStatusSchema.optional().meta({
		description: "Only in admin responses; the content API leaves it out",
	}),
	createdAt: z.string().nullable(),
});

export const documentRefsResponseSchema = z
	.object({
		documents: z.array(documentRefResponseSchema).optional(),
		media: z.array(mediaResponseSchema).optional(),
		users: z.array(documentUserRefResponseSchema).optional(),
		emails: z.array(documentEmailRefResponseSchema).optional(),
		agents: z
			.array(agentActorSchema.extend({ id: z.string() }))
			.optional()
			.meta({ description: "Agents behind run IDs, keyed by run ID" }),
	})
	.strict();

const contentBrickResponseSchema = z.object({
	id: z.number(),
	key: z.string(),
	order: z.number(),
	fields: z.record(z.string(), z.unknown()),
});

const documentContentResponseSchema = z.object({
	id: z.number(),
	collectionKey: z.string(),
	version: z.string().nullable(),
	locale: contentDocumentLocaleSchema,
	route: contentDocumentRouteSchema,
	fields: z.record(z.string(), z.unknown()).meta({
		description:
			"Media and users are filled in, relations are related documents with their route and fields to the read's depth, and rich text has its embedded bricks and linked documents in node attrs",
	}),
	bricks: z.array(contentBrickResponseSchema).optional().meta({
		description: "Builder bricks in order, when the read includes bricks",
	}),
	fixed: z.record(z.string(), contentBrickResponseSchema).optional().meta({
		description: "Fixed bricks by key, when the read includes bricks",
	}),
	meta: z
		.object({
			versionId: z.number().nullable(),
			versions: z.record(
				z.string(),
				documentResponseVersionSchema
					.omit({ createdBy: true, createdByRunId: true })
					.extend({ createdBy: userDisplaySchema.nullable() })
					.nullable(),
			),
			createdAt: z.string().nullable(),
			updatedAt: z.string().nullable(),
			createdBy: userDisplaySchema.nullable(),
			updatedBy: userDisplaySchema.nullable(),
		})
		.optional(),
});

/** What content API document reads can include. */
const contentDocumentIncludeSchema = z.enum(["bricks", "meta"]);

const documentRefsIncludeSchema = z.union([
	z.literal("refs"),
	z.enum([
		"refs.documents",
		"refs.media",
		"refs.users",
		"refs.emails",
		"refs.agents",
	]),
]);

//* underscore-prefixed top-level field sorts are resolved later
const documentSortKeySchema = z.union([
	z.enum(["createdAt", "updatedAt", "order"]),
	z.string().regex(/^_[a-zA-Z0-9-_]+$/),
]);

const documentSortSchema = z
	.array(
		z.object({
			key: documentSortKeySchema,
			direction: z.enum(["asc", "desc"]),
		}),
	)
	.optional();

const documentEditorParams = z.object({
	collectionKey: z.string().trim().meta({
		description: "The collection key",
		example: "page",
	}),
	id: z.string().trim().meta({
		description: "The document's ID",
		example: 1,
	}),
	tabId: z.string().trim().min(1).max(64).meta({
		description: "The browser tab with the document open",
		example: "7f3a2c1e-5b4d-4e6f-8a9b-0c1d2e3f4a5b",
	}),
});

export const controllerSchemas = {
	updateEditor: {
		body: z.object({
			requestId: z.number().int().positive().nullable().meta({
				description:
					"The request whose proposal is open, or null for latest. Holding it needs the same access as saving it",
				example: null,
			}),
			takeOver: z.boolean().default(false).meta({
				description: "Takes hold of the document from the tab that holds it",
				example: false,
			}),
		}),
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: documentEditorParams,
		response: z.object({
			holding: z.boolean().meta({
				description: "Whether this tab holds the document and can edit it",
			}),
			holder: z
				.object({
					user: userDisplaySchema,
					self: z.boolean().meta({
						description: "Whether it's the same person, in another tab",
					}),
					since: z.string(),
				})
				.nullable()
				.meta({ description: "The tab that holds it, when it isn't this one" }),
		}),
	} satisfies ControllerSchema,
	deleteEditor: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: documentEditorParams,
		response: undefined,
	} satisfies ControllerSchema,
	createSingle: {
		body: z.object({
			bricks: z
				.array(brickInputSchema)
				.meta({
					description: "An array of bricks to be added to the document",
				})
				.optional(),
			fields: z
				.array(fieldInputSchema)
				.meta({
					description: "Collection field values",
				})
				.optional(),
		}),
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: z.object({
			collectionKey: z.string().trim().meta({
				description: "The collection key",
				example: "page",
			}),
		}),
		response: z.object({
			id: z.number().meta({
				description: "The new document's ID",
				example: 1,
			}),
		}),
	} satisfies ControllerSchema,
	requestSingle: {
		body: z.object({
			title: z.string().trim().min(1).max(200).meta({
				description: "The title of the create request",
				example: "New about page",
			}),
			description: richTextJSONSchema.nullable().optional(),
			reviewerIds: z.array(z.number().int().positive()).optional(),
			bricks: z
				.array(brickInputSchema)
				.meta({
					description: "An array of bricks to be added to the document",
				})
				.optional(),
			fields: z
				.array(fieldInputSchema)
				.meta({
					description: "Collection field values",
				})
				.optional(),
		}),
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: z.object({
			collectionKey: z.string().trim().meta({
				description: "The collection key",
				example: "page",
			}),
		}),
		response: z.object({
			id: z.number().meta({
				description: "The requested document's ID",
				example: 1,
			}),
			requestId: z.number().meta({
				description: "The create request that will create the document",
				example: 1,
			}),
		}),
	} satisfies ControllerSchema,
	duplicateSingle: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: z.object({
			collectionKey: z.string().trim().meta({
				description: "The collection key",
				example: "page",
			}),
			id: z.string().trim().meta({
				description: "The source document ID",
				example: 1,
			}),
		}),
		response: z.object({
			id: z.number().meta({
				description: "The duplicated document's ID",
				example: 2,
			}),
		}),
	} satisfies ControllerSchema,
	createVersion: {
		body: z.object({
			bricks: z
				.array(brickInputSchema)
				.meta({
					description: "An array of bricks to be added to the document",
				})
				.optional(),
			fields: z
				.array(fieldInputSchema)
				.meta({
					description: "Collection field values",
				})
				.optional(),
			baseContentId: z.string().min(1).optional().meta({
				description:
					"The latest content ID the edit was based on. When set, the save is refused with a 409 if latest has been saved since.",
			}),
			editorTabId: z.string().trim().min(1).max(64).optional().meta({
				description:
					"The admin tab saving. A tab that has the document open but no longer holds it, eg. after someone took over, is refused with a 409.",
			}),
		}),
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: z.object({
			id: z.string().trim().meta({
				description: "The document's ID",
				example: 1,
			}),
			collectionKey: z.string().trim().meta({
				description: "The collection key",
				example: "page",
			}),
		}),
		response: z.object({
			id: z.number().meta({
				description: "The document's ID",
				example: 1,
			}),
		}),
	} satisfies ControllerSchema,
	updateVersion: {
		body: z.object({
			bricks: z
				.array(brickInputSchema)
				.meta({
					description: "An array of bricks to be added to the document",
				})
				.optional(),
			fields: z
				.array(fieldInputSchema)
				.meta({
					description: "Collection field values",
				})
				.optional(),
			baseContentId: z.string().min(1).optional().meta({
				description:
					"The version content ID the edit was based on. When set, the update is refused with a 409 if the version has been saved since.",
			}),
			editorTabId: z.string().trim().min(1).max(64).optional().meta({
				description:
					"The admin tab saving. A tab that has the document open but no longer holds it, eg. after someone took over, is refused with a 409.",
			}),
		}),
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: z.object({
			id: z.string().trim().meta({
				description: "The document's ID",
				example: 1,
			}),
			collectionKey: z.string().trim().meta({
				description: "The collection key",
				example: "page",
			}),
			versionId: z.string().trim().meta({
				description: "The version ID",
				example: 1,
			}),
		}),
		response: z.object({
			id: z.number().meta({
				description: "The document's ID",
				example: 1,
			}),
			versionId: z.number().meta({
				description: "The updated version ID",
				example: 1,
			}),
			versionType: versionTypesSchema.meta({
				description: "The updated version type",
				example: "latest",
			}),
			contentId: z.string().meta({
				description: "The updated version content ID",
				example: "123e4567-e89b-12d3-a456-426614174000",
			}),
			updatedAt: z.string().nullable().meta({
				description: "The timestamp when this version was updated",
				example: "2025-04-10T15:45:00Z",
			}),
		}),
	} satisfies ControllerSchema,
	checkVersion: {
		body: z.object({
			bricks: z
				.array(brickInputSchema)
				.meta({
					description: "An array of draft bricks to check",
				})
				.optional(),
			fields: z
				.array(fieldInputSchema)
				.meta({
					description: "Draft collection field values to check",
				})
				.optional(),
		}),
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: z.object({
			id: z.string().trim().meta({
				description: "The document's ID",
				example: 1,
			}),
			collectionKey: z.string().trim().meta({
				description: "The collection key",
				example: "page",
			}),
			versionId: z.string().trim().meta({
				description: "The version ID",
				example: 1,
			}),
		}),
		response: z.object({
			bricks: z.array(brickInputSchema),
			fields: z.array(fieldInputSchema),
		}),
	} satisfies ControllerSchema,
	publish: {
		body: z.object({
			environment: z.string().trim().min(1).meta({
				description: "The environment to publish to",
				example: "production",
			}),
			sourceVersionId: z.number().int().positive().optional().meta({
				description:
					"The latest or environment version to publish. Defaults to latest. Revisions are restored to latest first.",
				example: 1,
			}),
		}),
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: z.object({
			collectionKey: z.string().trim().meta({
				description: "The collection key",
				example: "page",
			}),
			id: z.string().trim().meta({
				description: "The document ID",
				example: 1,
			}),
		}),
		response: undefined,
	} satisfies ControllerSchema,
	unpublish: {
		body: z.object({
			environment: z.string().trim().min(1).meta({
				description: "The environment to remove the document from",
				example: "production",
			}),
		}),
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: z.object({
			collectionKey: z.string().trim().meta({
				description: "The collection key",
				example: "page",
			}),
			id: z.string().trim().meta({
				description: "The document ID",
				example: 1,
			}),
		}),
		response: undefined,
	} satisfies ControllerSchema,
	createPreview: {
		body: z.object({
			locale: z.string().trim().min(1).optional(),
			mode: z.enum(["perspective", "scoped"]).optional(),
			versionType: versionTypesSchema,
			versionId: z.number().int().positive().optional(),
		}),
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: z.object({
			collectionKey: z.string().trim(),
			id: z.string().trim(),
		}),
		response: z.object({
			url: z.url().nullable(),
			expiresAt: z.iso.datetime().nullable(),
		}),
	} satisfies ControllerSchema,
	deleteMultiple: {
		body: z.object({
			ids: z.array(z.number()).meta({
				description: "An array of document IDs you wish to delete",
				example: [1, 2, 3],
			}),
		}),
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: z.object({
			collectionKey: z.string().trim().meta({
				description: "The collection key",
				example: "page",
			}),
		}),
		response: undefined,
	} satisfies ControllerSchema,
	deleteSingle: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: z.object({
			collectionKey: z.string().trim().meta({
				description: "The collection key",
				example: "page",
			}),
			id: z.string().trim().meta({
				description: "The document ID",
				example: 1,
			}),
		}),
		response: undefined,
	} satisfies ControllerSchema,
	deleteSinglePermanently: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: z.object({
			collectionKey: z.string().trim().meta({
				description: "The collection key",
				example: "page",
			}),
			id: z.string().trim().meta({
				description: "The document ID",
				example: 1,
			}),
		}),
		response: undefined,
	} satisfies ControllerSchema,
	deleteMultiplePermanently: {
		body: z.object({
			ids: z.array(z.number()).meta({
				description: "An array of document IDs you wish to permanently delete",
				example: [1, 2, 3],
			}),
		}),
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: z.object({
			collectionKey: z.string().trim().meta({
				description: "The collection key",
				example: "page",
			}),
		}),
		response: undefined,
	} satisfies ControllerSchema,
	restoreMultiple: {
		body: z.object({
			ids: z.array(z.number()).meta({
				description: "An array of document IDs you wish to restore",
				example: [1, 2, 3],
			}),
		}),
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: z.object({
			collectionKey: z.string().trim().meta({
				description: "The collection key",
				example: "page",
			}),
		}),
		response: undefined,
	} satisfies ControllerSchema,
	updateOrder: {
		body: z.object({
			previousDocumentId: z.number().nullable().meta({
				description:
					"The ID of the document that should come directly before the moved document in the manual order, or null when moving to the start",
				example: 2,
			}),
			nextDocumentId: z.number().nullable().meta({
				description:
					"The ID of the document that should come directly after the moved document in the manual order, or null when moving to the end",
				example: 3,
			}),
		}),
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: z.object({
			collectionKey: z.string().trim().meta({
				description: "The collection key",
				example: "page",
			}),
			id: z.string().trim().meta({
				description: "The document ID",
				example: 1,
			}),
		}),
		response: undefined,
	} satisfies ControllerSchema,
	updateWorkflow: {
		body: z.object({
			versionId: z.number().int().positive().optional().meta({
				description: "The proposal version to update. Defaults to latest",
				example: 2,
			}),
			stage: z.string().trim().min(1).optional(),
			assigneeIds: z.array(z.number()).optional(),
		}),
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: z.object({
			collectionKey: z.string().trim().meta({
				description: "The collection key",
				example: "page",
			}),
			id: z.string().trim().meta({
				description: "The document ID",
				example: 1,
			}),
		}),
		response: undefined,
	} satisfies ControllerSchema,
	getWorkflowAssignees: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: z.object({
			collectionKey: z.string().trim().meta({
				description: "The collection key",
				example: "page",
			}),
		}),
		response: z.array(userDisplaySchema),
	} satisfies ControllerSchema,
	getMultipleRevisions: {
		body: undefined,
		query: {
			string: z
				.object({
					"filter[createdBy]": queryString.schema.filter(true, {
						example: "1",
					}),
					sort: queryString.schema.sort("createdAt"),
					page: queryString.schema.page,
					perPage: queryString.schema.perPage,
				})
				.meta(queryString.meta),
			formatted: z.object({
				filter: z
					.object({
						createdBy: z
							.union([
								queryFormatted.schema.filters.single,
								queryFormatted.schema.filters.union,
							])
							.optional(),
					})
					.optional(),
				filterOr: queryFormatted.schema.filterOr,
				sort: z
					.array(
						z.object({
							key: z.enum(["createdAt"]),
							direction: z.enum(["asc", "desc"]),
						}),
					)
					.optional(),
				page: queryFormatted.schema.page,
				perPage: queryFormatted.schema.perPage,
			}),
		},
		params: z.object({
			collectionKey: z.string().meta({
				description: "The collection key",
				example: "page",
			}),
			id: z.string().trim().meta({
				description: "The document ID",
				example: 1,
			}),
		}),
		response: z.array(documentVersionResponseSchema),
	} satisfies ControllerSchema,
	getMultiple: {
		query: {
			string: z
				.object({
					"filter[id]": queryString.schema.filter(true, {
						example: "1",
					}),
					"filter[createdBy]": queryString.schema.filter(true, {
						example: "1",
					}),
					"filter[updatedBy]": queryString.schema.filter(true, {
						example: "1",
					}),
					"filter[createdAt]": queryString.schema.filter(false, {
						example: "2025-03-15T09:22:10Z",
					}),
					"filter[updatedAt]": queryString.schema.filter(false, {
						example: "2025-03-15T09:22:10Z",
					}),
					"filter[isDeleted]": queryString.schema.filter(true, {
						example: "true",
					}),
					"filter[deletedBy]": queryString.schema.filter(true, {
						example: "1",
					}),
					"filter[pending]": queryString.schema.filter(false, {
						description:
							"List requested documents waiting on an open create request instead of created ones. Requested documents are read from their proposal",
						example: "true",
					}),
					"filter[workflowStage]": queryString.schema.filter(false, {
						example: "done",
					}),
					"filter[workflowAssignee]": queryString.schema.filter(true, {
						example: "1,2",
					}),
					"filter[envStatus.key]": queryString.schema.filter(false, {
						description:
							"Filter by how an environment's version compares with latest: unpublished, out-of-sync or in-sync",
						example: "out-of-sync",
					}),
					"filter[_customFieldKey]": queryString.schema.filter(true, {
						description:
							"Prefix custom field keys with an underscore to filter by them",
					}),
					"filter[_relationFieldKey.targetCollectionKey._customFieldKey]":
						queryString.schema.filter(true, {
							description:
								"Follow a relation field through its target collection to filter by a related document custom field",
							example: "Author surname",
						}),
					"filter[_relationFieldKey._customFieldKey]":
						queryString.schema.filter(true, {
							description:
								"Omit the target collection to use the relation field's first configured collection",
							example: "Author surname",
						}),
					"filter[brickKey._customFieldKey]": queryString.schema.filter(true, {
						description:
							"Add a brick key before the custom field key to filter against the brick",
					}),
					"filter[brickKey.repeaterKey._customFieldKey]":
						queryString.schema.filter(true, {
							description:
								"Target a repeater field by adding a repeater key after the brick key",
						}),
					include: queryString.schema.include(
						"refs,refs.documents,refs.media,refs.users,refs.emails,refs.agents",
					),
					sort: queryString.schema.sort(
						"createdAt,updatedAt,order,_customFieldKey",
					),
					page: queryString.schema.page,
					perPage: queryString.schema.perPage,
				})
				.meta(queryString.meta),
			formatted: z.object({
				filter: z
					.union([
						z.record(
							z.string(),
							z.union([
								queryFormatted.schema.filters.single,
								queryFormatted.schema.filters.union,
							]),
						),
						z.object({
							id: z
								.union([
									queryFormatted.schema.filters.single,
									queryFormatted.schema.filters.union,
								])
								.optional(),
							createdBy: z
								.union([
									queryFormatted.schema.filters.single,
									queryFormatted.schema.filters.union,
								])
								.optional(),
							updatedBy: z
								.union([
									queryFormatted.schema.filters.single,
									queryFormatted.schema.filters.union,
								])
								.optional(),
							createdAt: queryFormatted.schema.filters.single.optional(),
							updatedAt: queryFormatted.schema.filters.single.optional(),
							isDeleted: queryFormatted.schema.filters.single.optional(),
							deletedBy: queryFormatted.schema.filters.union.optional(),
							pending: queryFormatted.schema.filters.single.optional(),
							workflowStage: queryFormatted.schema.filters.single.optional(),
							workflowAssignee: queryFormatted.schema.filters.union.optional(),
						}),
					])
					.optional(),
				filterOr: queryFormatted.schema.filterOr,
				sort: documentSortSchema,
				include: z.array(documentRefsIncludeSchema).optional(),
				page: queryFormatted.schema.page,
				perPage: queryFormatted.schema.perPage,
			}),
		},
		params: z.object({
			collectionKey: z.string().trim().meta({
				description: "The collection key",
				example: "page",
			}),
			version: z.string().trim().meta({
				description: "The document version",
				example: "latest",
			}),
		}),
		body: undefined,
		response: z.array(documentResponseSchema),
	} satisfies ControllerSchema,
	getSingle: {
		query: {
			string: z.object({
				include: queryString.schema.include(
					"bricks,refs,refs.documents,refs.media,refs.users,refs.emails,refs.agents",
				),
			}),
			formatted: z.object({
				include: z
					.array(z.union([z.literal("bricks"), documentRefsIncludeSchema]))
					.optional(),
			}),
		},
		params: z.object({
			id: z.string().trim().meta({
				description: "The document ID",
				example: 1,
			}),
			versionOrId: z
				.union([
					z.literal("latest"),
					z.string().trim(), // version id or custom environment key
				])
				.meta({
					description: "The document version, or a version ID",
					example: "latest",
				}),
			collectionKey: z.string().trim().meta({
				description: "The collection key",
				example: "page",
			}),
		}),
		body: undefined,
		response: documentResponseSchema,
	} satisfies ControllerSchema,
	promoteVersion: {
		body: z.object({
			versionType: z
				.string()
				.trim()
				.refine((val) => val !== "revision" && val !== "latest", {
					message: "Promote to a configured environment key",
				})
				.meta({
					description:
						"The environment to publish the version to, eg. production or qa from the collection config. Latest and revisions can't be promoted to",
					example: "production",
				}),
		}),
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: z.object({
			collectionKey: z.string().trim().meta({
				description: "The collection key",
				example: "page",
			}),
			id: z.string().trim().meta({
				description: "The document ID",
				example: 1,
			}),
			versionId: z.string().trim().meta({
				description: "The version ID you want to promote",
				example: 2,
			}),
		}),
		response: undefined,
	} satisfies ControllerSchema,
	align: {
		body: z.object({
			source: z.string().trim().min(1).meta({
				description: "Latest or the environment to copy content from",
				example: "production",
			}),
			sourceContentId: z.string().min(1).meta({
				description: "The source content ID that was compared",
			}),
			destinationContentId: z.string().min(1).meta({
				description: "The destination content ID that was compared",
			}),
		}),
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: z.object({
			collectionKey: z.string().trim().meta({
				description: "The collection key",
				example: "page",
			}),
			id: z.string().trim().meta({
				description: "The document ID",
				example: 1,
			}),
			versionId: z.string().trim().meta({
				description: "The latest or proposal version to replace",
				example: 2,
			}),
		}),
		response: undefined,
	} satisfies ControllerSchema,
	restoreRevision: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: z.object({
			collectionKey: z.string().trim().meta({
				description: "The collection key",
				example: "page",
			}),
			id: z.string().trim().meta({
				description: "The document ID",
				example: 1,
			}),
			versionId: z.string().trim().meta({
				description: "The version ID you want to promote",
				example: 2,
			}),
		}),
		response: undefined,
	} satisfies ControllerSchema,
	content: {
		getSingle: {
			query: {
				string: z
					.object({
						preview: previewTokenSchema.optional(),
						version: contentDocumentVersionSchema,
						locale: contentLocaleSchema.optional(),
						fallbackLocale: contentFallbackLocaleSchema.optional(),
						depth: contentDepthSchema.optional(),
						"filter[id]": queryString.schema.filter(true, {
							example: "1",
						}),
						"filter[createdBy]": queryString.schema.filter(true, {
							example: "1",
						}),
						"filter[updatedBy]": queryString.schema.filter(true, {
							example: "1",
						}),
						"filter[createdAt]": queryString.schema.filter(false, {
							example: "2025-03-15T09:22:10Z",
						}),
						"filter[updatedAt]": queryString.schema.filter(false, {
							example: "2025-03-15T09:22:10Z",
						}),
						"filter[isDeleted]": queryString.schema.filter(false, {
							example: "true",
						}),
						"filter[_customFieldKey]": queryString.schema.filter(true, {
							description:
								"Prefix custom field keys with an underscore to filter by them",
						}),
						"filter[_relationFieldKey.targetCollectionKey._customFieldKey]":
							queryString.schema.filter(true, {
								description:
									"Follow a relation field through its target collection to filter by a related document custom field",
								example: "Author surname",
							}),
						"filter[_relationFieldKey._customFieldKey]":
							queryString.schema.filter(true, {
								description:
									"Omit the target collection to use the relation field's first configured collection",
								example: "Author surname",
							}),
						"filter[brickKey._customFieldKey]": queryString.schema.filter(
							true,
							{
								description:
									"Add a brick key before the custom field key to filter against the brick",
							},
						),
						"filter[brickKey.repeaterKey._customFieldKey]":
							queryString.schema.filter(true, {
								description:
									"Target a repeater field by adding a repeater key after the brick key",
							}),
						include: queryString.schema.include("bricks,meta"),
						page: queryString.schema.page,
						perPage: queryString.schema.perPage,
					})
					.meta(queryString.meta),
				formatted: z.object({
					filter: z
						.union([
							z.record(
								z.string(),
								z.union([
									queryFormatted.schema.filters.single,
									queryFormatted.schema.filters.union,
								]),
							),
							z.object({
								id: queryFormatted.schema.filters.single.optional(),
								createdBy: queryFormatted.schema.filters.single.optional(),
								updatedBy: queryFormatted.schema.filters.single.optional(),
								createdAt: queryFormatted.schema.filters.single.optional(),
								updatedAt: queryFormatted.schema.filters.single.optional(),
								isDeleted: queryFormatted.schema.filters.single.optional(),
							}),
						])
						.optional(),
					filterOr: queryFormatted.schema.filterOr,
					include: z.array(contentDocumentIncludeSchema).optional(),
				}),
			},
			params: z.object({
				collectionKey: z.string().trim().meta({
					description: "The collection key",
					example: "page",
				}),
			}),
			body: undefined,
			response: documentContentResponseSchema,
		} satisfies ControllerSchema,
		getMultiple: {
			query: {
				string: z
					.object({
						preview: previewTokenSchema.optional(),
						version: contentDocumentVersionSchema,
						locale: contentLocaleSchema.optional(),
						fallbackLocale: contentFallbackLocaleSchema.optional(),
						depth: contentDepthSchema.optional(),
						"filter[id]": queryString.schema.filter(true, {
							example: "1",
						}),
						"filter[createdBy]": queryString.schema.filter(true, {
							example: "1",
						}),
						"filter[updatedBy]": queryString.schema.filter(true, {
							example: "1",
						}),
						"filter[createdAt]": queryString.schema.filter(false, {
							example: "2025-03-15T09:22:10Z",
						}),
						"filter[updatedAt]": queryString.schema.filter(false, {
							example: "2025-03-15T09:22:10Z",
						}),
						"filter[isDeleted]": queryString.schema.filter(false, {
							example: "true",
						}),
						"filter[_customFieldKey]": queryString.schema.filter(true, {
							description:
								"Prefix custom field keys with an underscore to filter by them",
						}),
						"filter[_relationFieldKey.targetCollectionKey._customFieldKey]":
							queryString.schema.filter(true, {
								description:
									"Follow a relation field through its target collection to filter by a related document custom field",
								example: "Author surname",
							}),
						"filter[_relationFieldKey._customFieldKey]":
							queryString.schema.filter(true, {
								description:
									"Omit the target collection to use the relation field's first configured collection",
								example: "Author surname",
							}),
						"filter[brickKey._customFieldKey]": queryString.schema.filter(
							true,
							{
								description:
									"Add a brick key before the custom field key to filter against the brick",
							},
						),
						"filter[brickKey.repeaterKey._customFieldKey]":
							queryString.schema.filter(true, {
								description:
									"Target a repeater field by adding a repeater key after the brick key",
							}),
						include: queryString.schema.include("bricks,meta"),
						sort: queryString.schema.sort(
							"createdAt,updatedAt,order,_customFieldKey",
						),
						page: queryString.schema.page,
						perPage: queryString.schema.perPage,
					})
					.meta(queryString.meta),
				formatted: z.object({
					filter: z
						.union([
							z.record(
								z.string(),
								z.union([
									queryFormatted.schema.filters.single,
									queryFormatted.schema.filters.union,
								]),
							),
							z.object({
								id: z
									.union([
										queryFormatted.schema.filters.single,
										queryFormatted.schema.filters.union,
									])
									.optional(),
								createdBy: z
									.union([
										queryFormatted.schema.filters.single,
										queryFormatted.schema.filters.union,
									])
									.optional(),
								updatedBy: z
									.union([
										queryFormatted.schema.filters.single,
										queryFormatted.schema.filters.union,
									])
									.optional(),
								createdAt: queryFormatted.schema.filters.single.optional(),
								updatedAt: queryFormatted.schema.filters.single.optional(),
								isDeleted: queryFormatted.schema.filters.single.optional(),
							}),
						])
						.optional(),
					filterOr: queryFormatted.schema.filterOr,
					sort: documentSortSchema,
					include: z.array(contentDocumentIncludeSchema).optional(),
					page: queryFormatted.schema.page,
					perPage: queryFormatted.schema.perPage,
				}),
			},
			params: z.object({
				collectionKey: z.string().trim().meta({
					description: "The collection key",
					example: "page",
				}),
			}),
			body: undefined,
			response: z.array(documentContentResponseSchema),
		} satisfies ControllerSchema,
	},
};

export type GetMultipleQueryParams = z.infer<
	typeof controllerSchemas.getMultiple.query.formatted
>;
export type GetSingleQueryParams = z.infer<
	typeof controllerSchemas.getSingle.query.formatted
>;
/** What content document reads include before their references are filled in: the shared refs the document tools read. */
export const documentReadIncludeSchema = z
	.array(
		z.union([
			z.literal("bricks"),
			z.literal("meta"),
			documentRefsIncludeSchema,
		]),
	)
	.optional();

type DocumentReadQuery<TQuery> = Omit<TQuery, "include"> & {
	include?: z.infer<typeof documentReadIncludeSchema>;
};
export type ContentGetSingleQueryParams = DocumentReadQuery<
	z.infer<typeof controllerSchemas.content.getSingle.query.formatted>
>;
export type ContentGetMultipleQueryParams = DocumentReadQuery<
	z.infer<typeof controllerSchemas.content.getMultiple.query.formatted>
>;
export type ContentReadSingleQueryParams = z.infer<
	typeof controllerSchemas.content.getSingle.query.formatted
>;
export type ContentReadMultipleQueryParams = z.infer<
	typeof controllerSchemas.content.getMultiple.query.formatted
>;
export type GetMultipleRevisionsQueryParams = z.infer<
	typeof controllerSchemas.getMultipleRevisions.query.formatted
>;
