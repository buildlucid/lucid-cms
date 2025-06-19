import z from "zod/v4";
import { queryFormatted, queryString } from "./helpers/querystring.js";
import {
	brickClientResponseSchema,
	brickInputSchema,
	brickResponseSchema,
} from "./collection-bricks.js";
import {
	fieldClientResponseSchema,
	fieldInputSchema,
	fieldResponseSchema,
} from "./collection-fields.js";
import { documentVersionResponseSchema } from "./document-versions.js";
import type { ControllerSchema } from "../types.js";

const documentResponseUserSchema = z.object({
	id: z.number().meta({
		description: "The user ID",
		example: 42,
	}),
	email: z.email().nullable().meta({
		description: "The email address of the user",
		example: "admin@lucidcms.io",
	}),
	firstName: z.string().nullable().meta({
		description: "The first name of the user",
		example: "John",
	}),
	lastName: z.string().nullable().meta({
		description: "The last name of the user",
		example: "Smith",
	}),
	username: z.string().nullable().meta({
		description: "The username of the user",
		example: "admin",
	}),
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
	createdAt: z.string().nullable().meta({
		description: "The timestamp when this version was created",
		example: "2025-04-10T14:30:00Z",
	}),
	createdBy: z.number().nullable().meta({
		description: "The ID of the user who created this version",
		example: 42,
	}),
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
	status: z.enum(["draft", "published", "revision"]).nullable().meta({
		description: "The current status of the document",
		example: "published",
	}),
	versionId: z.number().nullable().meta({
		description: "The current version ID",
		example: 1,
	}),
	version: z.object({
		draft: documentResponseVersionSchema.nullable(),
		published: documentResponseVersionSchema.nullable(),
	}),
	createdBy: documentResponseUserSchema.nullable(),
	updatedBy: documentResponseUserSchema.nullable(),
	createdAt: z.string().nullable().meta({
		description: "The timestamp when this document was created",
		example: "2025-04-08T09:00:00Z",
	}),
	updatedAt: z.string().nullable().meta({
		description: "The timestamp when this document was last updated",
		example: "2025-04-10T15:45:00Z",
	}),
});

const documentResponseSchema = documentResponseBaseSchema.extend({
	bricks: z.array(brickResponseSchema).nullable().optional(),
	fields: z.array(fieldResponseSchema).nullable().optional(),
});
const documentClientResponseSchema = documentResponseBaseSchema.extend({
	bricks: z.array(brickClientResponseSchema).nullable().optional(),
	fields: z
		.record(z.string(), z.array(fieldClientResponseSchema))
		.nullable()
		.optional(),
});

export const controllerSchemas = {
	createSingle: {
		body: z.object({
			publish: z.boolean().meta({
				description: "Whether it should be published or be a draft.",
				example: false,
			}),
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
			collectionKey: z.string().meta({
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
	updateSingle: {
		body: z.object({
			publish: z.boolean().meta({
				description: "Whether it should be published or be a draft.",
				example: false,
			}),
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
			id: z.string().meta({
				description: "The document's ID",
				example: 1,
			}),
			collectionKey: z.string().meta({
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
			collectionKey: z.string().meta({
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
			collectionKey: z.string().meta({
				description: "The collection key",
				example: "page",
			}),
			id: z.string().meta({
				description: "The document ID",
				example: 1,
			}),
		}),
		response: undefined,
	} satisfies ControllerSchema,
	getMultipleRevisions: {
		body: undefined,
		query: {
			string: z
				.object({
					"filter[createdBy]": queryString.schema.filter(true, "1"),
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
				sort: z
					.array(
						z.object({
							key: z.enum(["createdAt"]),
							value: z.enum(["asc", "desc"]),
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
			id: z.string().meta({
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
					"filter[id]": queryString.schema.filter(true, "1"),
					"filter[createdBy]": queryString.schema.filter(true, "1"),
					"filter[updatedBy]": queryString.schema.filter(true, "1"),
					"filter[createdAt]": queryString.schema.filter(
						false,
						"2025-03-15T09:22:10Z",
					),
					"filter[updatedAt]": queryString.schema.filter(
						false,
						"2025-03-15T09:22:10Z",
					),
					"filter[_customFieldKey]": queryString.schema.filter(
						true,
						undefined,
						"Prefix custom field keys with an underscore to filter by them",
					),
					"filter[brickKey._customFieldKey]": queryString.schema.filter(
						true,
						undefined,
						"Add a brick key before the custom field key to filter against the brick",
					),
					"filter[brickKey.repeaterKey._customFieldKey]":
						queryString.schema.filter(
							true,
							undefined,
							"Target a repeater field by adding a repeater key after the brick key",
						),
					sort: queryString.schema.sort("createdAt,updatedAt"),
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
						}),
					])
					.optional(),
				sort: z
					.array(
						z.object({
							key: z.enum(["createdAt", "updatedAt"]),
							value: z.enum(["asc", "desc"]),
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
			status: z.enum(["published", "draft"]).meta({
				description: "The status version type",
				example: "draft",
			}),
		}),
		body: undefined,
		response: z.array(documentResponseSchema),
	} satisfies ControllerSchema,
	getSingle: {
		query: {
			string: z.object({
				include: queryString.schema.include("bricks"),
			}),
			formatted: z.object({
				include: z.array(z.enum(["bricks"])).optional(),
			}),
		},
		params: z.object({
			id: z.string().meta({
				description: "The document ID",
				example: 1,
			}),
			statusOrId: z
				.union([
					z.literal("published"),
					z.literal("draft"),
					z.string(), // version id
				])
				.meta({
					description: "The status (version type), or a version ID",
					example: "draft",
				}),
			collectionKey: z.string().meta({
				description: "The collection key",
				example: "page",
			}),
		}),
		body: undefined,
		response: documentResponseSchema,
	} satisfies ControllerSchema,
	promoteVersion: {
		body: z.object({
			versionType: z.enum(["draft", "published"]).meta({
				description: "The version type you want to promote it to",
				example: "published",
			}),
		}),
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: z.object({
			collectionKey: z.string().meta({
				description: "The collection key",
				example: "page",
			}),
			id: z.string().meta({
				description: "The document ID",
				example: 1,
			}),
			versionId: z.string().meta({
				description: "The version ID you want to promote",
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
			collectionKey: z.string().meta({
				description: "The collection key",
				example: "page",
			}),
			id: z.string().meta({
				description: "The document ID",
				example: 1,
			}),
			versionId: z.string().meta({
				description: "The version ID you want to promote",
				example: 2,
			}),
		}),
		response: undefined,
	} satisfies ControllerSchema,
	client: {
		getSingle: {
			query: {
				string: z
					.object({
						"filter[id]": queryString.schema.filter(true, "1"),
						"filter[createdBy]": queryString.schema.filter(true, "1"),
						"filter[updatedBy]": queryString.schema.filter(true, "1"),
						"filter[createdAt]": queryString.schema.filter(
							false,
							"2025-03-15T09:22:10Z",
						),
						"filter[updatedAt]": queryString.schema.filter(
							false,
							"2025-03-15T09:22:10Z",
						),
						"filter[_customFieldKey]": queryString.schema.filter(
							true,
							undefined,
							"Prefix custom field keys with an underscore to filter by them",
						),
						"filter[brickKey._customFieldKey]": queryString.schema.filter(
							true,
							undefined,
							"Add a brick key before the custom field key to filter against the brick",
						),
						"filter[brickKey.repeaterKey._customFieldKey]":
							queryString.schema.filter(
								true,
								undefined,
								"Target a repeater field by adding a repeater key after the brick key",
							),
						include: queryString.schema.include("bricks"),
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
							}),
						])
						.optional(),
					include: z.array(z.enum(["bricks"])).optional(),
				}),
			},
			params: z.object({
				collectionKey: z.string().meta({
					description: "The collection key",
					example: "page",
				}),
				status: z.enum(["published", "draft"]).meta({
					description: "The status version type",
					example: "draft",
				}),
			}),
			body: undefined,
			response: documentClientResponseSchema,
		} satisfies ControllerSchema,
		getMultiple: {
			query: {
				string: z
					.object({
						"filter[id]": queryString.schema.filter(true, "1"),
						"filter[createdBy]": queryString.schema.filter(true, "1"),
						"filter[updatedBy]": queryString.schema.filter(true, "1"),
						"filter[createdAt]": queryString.schema.filter(
							false,
							"2025-03-15T09:22:10Z",
						),
						"filter[updatedAt]": queryString.schema.filter(
							false,
							"2025-03-15T09:22:10Z",
						),
						"filter[_customFieldKey]": queryString.schema.filter(
							true,
							undefined,
							"Prefix custom field keys with an underscore to filter by them",
						),
						"filter[brickKey._customFieldKey]": queryString.schema.filter(
							true,
							undefined,
							"Add a brick key before the custom field key to filter against the brick",
						),
						"filter[brickKey.repeaterKey._customFieldKey]":
							queryString.schema.filter(
								true,
								undefined,
								"Target a repeater field by adding a repeater key after the brick key",
							),
						sort: queryString.schema.sort("createdAt,updatedAt"),
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
							}),
						])
						.optional(),
					sort: z
						.array(
							z.object({
								key: z.enum(["createdAt", "updatedAt"]),
								value: z.enum(["asc", "desc"]),
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
				status: z.enum(["published", "draft"]).meta({
					description: "The status version type",
					example: "draft",
				}),
			}),
			body: undefined,
			response: z.array(documentClientResponseSchema),
		} satisfies ControllerSchema,
	},
};

export type GetMultipleQueryParams = z.infer<
	typeof controllerSchemas.getMultiple.query.formatted
>;
export type GetSingleQueryParams = z.infer<
	typeof controllerSchemas.getSingle.query.formatted
>;
export type ClientGetSingleQueryParams = z.infer<
	typeof controllerSchemas.client.getSingle.query.formatted
>;
export type ClientGetMultipleQueryParams = z.infer<
	typeof controllerSchemas.client.getMultiple.query.formatted
>;
export type GetMultipleRevisionsQueryParams = z.infer<
	typeof controllerSchemas.getMultipleRevisions.query.formatted
>;
