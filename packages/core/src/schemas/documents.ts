import z from "zod";
import { BrickSchema } from "./collection-bricks.js";
import { FieldSchema } from "./collection-fields.js";
import defaultQuery, { filterSchemas } from "./default-query.js";

export default {
	createSingle: {
		body: z.object({
			publish: z.boolean(),
			bricks: z.array(BrickSchema).optional(),
			fields: z.array(FieldSchema).optional(),
		}),
		query: undefined,
		params: z.object({
			collectionKey: z.string(),
		}),
	},
	updateSingle: {
		body: z.object({
			publish: z.boolean(),
			bricks: z.array(BrickSchema).optional(),
			fields: z.array(FieldSchema).optional(),
		}),
		query: undefined,
		params: z.object({
			id: z.string(),
			collectionKey: z.string(),
		}),
	},
	deleteSingle: {
		body: undefined,
		query: undefined,
		params: z.object({
			collectionKey: z.string(),
			id: z.string(),
		}),
	},
	deleteMultiple: {
		body: z.object({
			ids: z.array(z.number()),
		}),
		query: undefined,
		params: z.object({
			collectionKey: z.string(),
		}),
	},
	getSingle: {
		query: z.object({
			include: z.array(z.enum(["bricks"])).optional(),
		}),
		params: z.object({
			id: z.string(),
			statusOrId: z.union([
				z.literal("published"),
				z.literal("draft"),
				z.string(), // version id
			]),
			collectionKey: z.string(),
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
						id: z.union([filterSchemas.single, filterSchemas.union]).optional(),
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
	getMultipleRevisions: {
		body: undefined,
		query: z.object({
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
		params: z.object({
			collectionKey: z.string(),
			id: z.string(),
		}),
	},
	restoreRevision: {
		body: undefined,
		query: undefined,
		params: z.object({
			id: z.string(),
			versionId: z.string(),
			collectionKey: z.string(),
		}),
	},
	promoteVersion: {
		body: z.object({
			versionType: z.enum(["draft", "published"]),
		}),
		query: undefined,
		params: z.object({
			collectionKey: z.string(),
			id: z.string(),
			versionId: z.string(),
		}),
	},

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
