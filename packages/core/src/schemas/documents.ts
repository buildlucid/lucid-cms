// import z from "zod";
// import { BrickSchema } from "./collection-bricks.js";
// import { FieldSchema } from "./collection-fields.js";
// import defaultQuery, { filterSchemas } from "./default-query.js";

// export default {
// 	createSingle: {
// 		body: z.object({
// 			publish: z.boolean(),
// 			bricks: z.array(BrickSchema).optional(),
// 			fields: z.array(FieldSchema).optional(),
// 		}),
// 		query: undefined,
// 		params: z.object({
// 			collectionKey: z.string(),
// 		}),
// 	},
// 	updateSingle: {
// 		body: z.object({
// 			publish: z.boolean(),
// 			bricks: z.array(BrickSchema).optional(),
// 			fields: z.array(FieldSchema).optional(),
// 		}),
// 		query: undefined,
// 		params: z.object({
// 			id: z.string(),
// 			collectionKey: z.string(),
// 		}),
// 	},
// 	deleteSingle: {
// 		body: undefined,
// 		query: undefined,
// 		params: z.object({
// 			collectionKey: z.string(),
// 			id: z.string(),
// 		}),
// 	},
// 	deleteMultiple: {
// 		body: z.object({
// 			ids: z.array(z.number()),
// 		}),
// 		query: undefined,
// 		params: z.object({
// 			collectionKey: z.string(),
// 		}),
// 	},
// 	getSingle: {
// 		query: z.object({
// 			include: z.array(z.enum(["bricks"])).optional(),
// 		}),
// 		params: z.object({
// 			id: z.string(),
// 			statusOrId: z.union([
// 				z.literal("published"),
// 				z.literal("draft"),
// 				z.string(), // version id
// 			]),
// 			collectionKey: z.string(),
// 		}),
// 		body: undefined,
// 	},
// 	getMultiple: {
// 		query: z.object({
// 			filter: z
// 				.union([
// 					z.record(
// 						z.string(),
// 						z.union([filterSchemas.single, filterSchemas.union]),
// 					),
// 					z.object({
// 						id: z.union([filterSchemas.single, filterSchemas.union]).optional(),
// 						createdBy: z
// 							.union([filterSchemas.single, filterSchemas.union])
// 							.optional(),
// 						updatedBy: z
// 							.union([filterSchemas.single, filterSchemas.union])
// 							.optional(),
// 						createdAt: filterSchemas.single.optional(),
// 						updatedAt: filterSchemas.single.optional(),
// 					}),
// 				])
// 				.optional(),
// 			sort: z
// 				.array(
// 					z.object({
// 						key: z.enum(["createdAt", "updatedAt"]),
// 						value: z.enum(["asc", "desc"]),
// 					}),
// 				)
// 				.optional(),
// 			page: defaultQuery.page,
// 			perPage: defaultQuery.perPage,
// 		}),
// 		params: z.object({
// 			collectionKey: z.string(),
// 			status: z.enum(["published", "draft"]),
// 		}),
// 		body: undefined,
// 	},
// 	getMultipleRevisions: {
// 		body: undefined,
// 		query: z.object({
// 			filter: z
// 				.object({
// 					createdBy: z
// 						.union([filterSchemas.single, filterSchemas.union])
// 						.optional(),
// 				})
// 				.optional(),
// 			sort: z
// 				.array(
// 					z.object({
// 						key: z.enum(["createdAt"]),
// 						value: z.enum(["asc", "desc"]),
// 					}),
// 				)
// 				.optional(),
// 			page: defaultQuery.page,
// 			perPage: defaultQuery.perPage,
// 		}),
// 		params: z.object({
// 			collectionKey: z.string(),
// 			id: z.string(),
// 		}),
// 	},
// 	restoreRevision: {
// 		body: undefined,
// 		query: undefined,
// 		params: z.object({
// 			id: z.string(),
// 			versionId: z.string(),
// 			collectionKey: z.string(),
// 		}),
// 	},
// 	promoteVersion: {
// 		body: z.object({
// 			versionType: z.enum(["draft", "published"]),
// 		}),
// 		query: undefined,
// 		params: z.object({
// 			collectionKey: z.string(),
// 			id: z.string(),
// 			versionId: z.string(),
// 		}),
// 	},

// 	client: {
// 		getSingle: {
// 			query: z.object({
// 				filter: z
// 					.union([
// 						z.record(
// 							z.string(),
// 							z.union([filterSchemas.single, filterSchemas.union]),
// 						),
// 						z.object({
// 							id: filterSchemas.single.optional(),
// 							createdBy: filterSchemas.single.optional(),
// 							updatedBy: filterSchemas.single.optional(),
// 							createdAt: filterSchemas.single.optional(),
// 							updatedAt: filterSchemas.single.optional(),
// 						}),
// 					])
// 					.optional(),
// 				include: z.array(z.enum(["bricks"])).optional(),
// 			}),
// 			params: z.object({
// 				collectionKey: z.string(),
// 				status: z.enum(["published", "draft"]),
// 			}),
// 			body: undefined,
// 		},
// 		getMultiple: {
// 			query: z.object({
// 				filter: z
// 					.union([
// 						z.record(
// 							z.string(),
// 							z.union([filterSchemas.single, filterSchemas.union]),
// 						),
// 						z.object({
// 							id: z
// 								.union([filterSchemas.single, filterSchemas.union])
// 								.optional(),
// 							createdBy: z
// 								.union([filterSchemas.single, filterSchemas.union])
// 								.optional(),
// 							updatedBy: z
// 								.union([filterSchemas.single, filterSchemas.union])
// 								.optional(),
// 							createdAt: filterSchemas.single.optional(),
// 							updatedAt: filterSchemas.single.optional(),
// 						}),
// 					])
// 					.optional(),
// 				sort: z
// 					.array(
// 						z.object({
// 							key: z.enum(["createdAt", "updatedAt"]),
// 							value: z.enum(["asc", "desc"]),
// 						}),
// 					)
// 					.optional(),
// 				page: defaultQuery.page,
// 				perPage: defaultQuery.perPage,
// 			}),
// 			params: z.object({
// 				collectionKey: z.string(),
// 				status: z.enum(["published", "draft"]),
// 			}),
// 			body: undefined,
// 		},
// 	},
// };

import z from "zod";
import CollectionsFormatter from "../libs/formatters/collections.js";
import DocumentVersionsFormatter from "../libs/formatters/document-versions.js";
import { BrickSchema } from "./collection-bricks.js";
import { FieldSchema } from "./collection-fields.js";
import defaultQuery, { filterSchemas } from "./default-query.js";
import type { ControllerSchema } from "../types.js";
import queryString from "../utils/swagger/query-string.js";

const schema = {
	createSingle: {
		body: z.object({
			publish: z.boolean().meta({
				description: "Whether it should be published or be a draft.",
				example: false,
			}),
			bricks: z
				.array(BrickSchema)
				.meta({
					description: "An array of bricks to be added to the document",
				})
				.optional(),
			fields: z
				.array(FieldSchema)
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
							.union([filterSchemas.single, filterSchemas.union])
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
				page: defaultQuery.page,
				perPage: defaultQuery.perPage,
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
		response: z.array(DocumentVersionsFormatter.schema),
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
							z.union([filterSchemas.single, filterSchemas.union]),
						),
						z.object({
							id: z
								.union([filterSchemas.single, filterSchemas.union])
								.optional(),
							createdBy: z
								.union([filterSchemas.single, filterSchemas.union])
								.optional(),
							updatedBy: z
								.union([filterSchemas.single, filterSchemas.union])
								.optional(),
							createdAt: filterSchemas.single.optional(),
							updatedAt: filterSchemas.single.optional(),
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
				page: defaultQuery.page,
				perPage: defaultQuery.perPage,
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
		response: undefined, // TODO: add the schema here
	} satisfies ControllerSchema,

	// TODO: finish bellow
	client: {
		getSingle: {
			query: z.object({
				filter: z
					.union([
						z.record(
							z.string(),
							z.union([filterSchemas.single, filterSchemas.union]),
						),
						z.object({
							id: filterSchemas.single.optional(),
							createdBy: filterSchemas.single.optional(),
							updatedBy: filterSchemas.single.optional(),
							createdAt: filterSchemas.single.optional(),
							updatedAt: filterSchemas.single.optional(),
						}),
					])
					.optional(),
				include: z.array(z.enum(["bricks"])).optional(),
			}),
			params: z.object({
				collectionKey: z.string(),
				status: z.enum(["published", "draft"]),
			}),
			body: undefined,
		},
		getMultiple: {
			query: z.object({
				filter: z
					.union([
						z.record(
							z.string(),
							z.union([filterSchemas.single, filterSchemas.union]),
						),
						z.object({
							id: z
								.union([filterSchemas.single, filterSchemas.union])
								.optional(),
							createdBy: z
								.union([filterSchemas.single, filterSchemas.union])
								.optional(),
							updatedBy: z
								.union([filterSchemas.single, filterSchemas.union])
								.optional(),
							createdAt: filterSchemas.single.optional(),
							updatedAt: filterSchemas.single.optional(),
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
				page: defaultQuery.page,
				perPage: defaultQuery.perPage,
			}),
			params: z.object({
				collectionKey: z.string(),
				status: z.enum(["published", "draft"]),
			}),
			body: undefined,
		},
	},
};

export type GetMultipleQueryParams = z.infer<
	typeof schema.getMultiple.query.formatted
>;
export type ClientGetSingleQueryParams = z.infer<
	typeof schema.client.getSingle.query
>;
export type GetMultipleRevisionsQueryParams = z.infer<
	typeof schema.getMultipleRevisions.query.formatted
>;

export default schema;
