import z from "zod/v4";
import { queryFormatted, queryString } from "./helpers/querystring.js";
import type { ControllerSchema } from "../types.js";

const mediaFolderResponseSchema = z.object({
	id: z.number().meta({ description: "Media folder ID", example: 1 }),
	title: z
		.string()
		.meta({ description: "Media folder title", example: "Heros" }),
	parentFolderId: z
		.number()
		.nullable()
		.meta({ description: "Media folder parent ID", example: 1 }),
	createdBy: z
		.number()
		.nullable()
		.meta({ description: "Media folder created by", example: 1 }),
	updatedBy: z
		.number()
		.nullable()
		.meta({ description: "Media folder updated by", example: 1 }),
	createdAt: z.string().meta({
		description: "Creation timestamp",
		example: "2022-01-01T00:00:00Z",
	}),
	updatedAt: z.string().meta({
		description: "Last update timestamp",
		example: "2022-01-01T00:00:00Z",
	}),
});
const mediaFolderBreadcrumbResponseSchema = z.object({
	id: z.number().meta({ description: "Media folder ID", example: 1 }),
	title: z
		.string()
		.meta({ description: "Media folder title", example: "Heros" }),
	parentFolderId: z
		.number()
		.nullable()
		.meta({ description: "Media folder parent ID", example: 1 }),
});

export const controllerSchemas = {
	getMultiple: {
		query: {
			string: z
				.object({
					"filter[title]": queryString.schema.filter(false, {
						example: "Heros",
					}),
					"filter[parentFolderId]": queryString.schema.filter(false, {
						example: "1",
						nullable: true,
					}),
					sort: queryString.schema.sort("createdAt,updatedAt,title"),
					page: queryString.schema.page,
					perPage: queryString.schema.perPage,
				})
				.meta(queryString.meta),
			formatted: z.object({
				filter: z
					.object({
						title: queryFormatted.schema.filters.single.optional(),
						parentFolderId: queryFormatted.schema.filters.single.optional(),
					})
					.optional(),
				sort: z
					.array(
						z.object({
							key: z.enum(["createdAt", "updatedAt", "title"]),
							value: z.enum(["asc", "desc"]),
						}),
					)
					.optional(),
				page: queryFormatted.schema.page,
				perPage: queryFormatted.schema.perPage,
			}),
		},
		params: undefined,
		body: undefined,
		response: z.object({
			folders: z.array(mediaFolderResponseSchema),
			breadcrumbs: z.array(mediaFolderBreadcrumbResponseSchema),
		}),
	} satisfies ControllerSchema,
	deleteSingle: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: z.object({
			id: z.string().meta({
				description: "The media folder ID",
				example: 1,
			}),
		}),
		response: undefined,
	} satisfies ControllerSchema,
	updateSingle: {
		body: z.object({
			title: z
				.string()
				.min(1)
				.meta({
					description: "The media folder title",
					example: "Heros",
				})
				.optional(),
			parentFolderId: z
				.number()
				.nullable()
				.meta({
					description: "The media folder parent ID",
					example: 1,
				})
				.optional(),
		}),
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: z.object({
			id: z.string().meta({
				description: "The media folder ID",
				example: 1,
			}),
		}),
		response: undefined,
	} satisfies ControllerSchema,
	createSingle: {
		body: z.object({
			title: z.string().min(1).meta({
				description: "The media folder title",
				example: "Heros",
			}),
			parentFolderId: z
				.number()
				.nullable()
				.meta({
					description: "The media folder parent ID",
					example: 1,
				})
				.optional(),
		}),
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: undefined,
		response: undefined,
	} satisfies ControllerSchema,
};

export type GetMultipleQueryParams = z.infer<
	typeof controllerSchemas.getMultiple.query.formatted
>;
