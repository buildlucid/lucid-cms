import z from "zod";
import { queryString } from "../utils/swagger/index.js";
import defaultQuery, { filterSchemas } from "./default-query.js";
import MediaFormatter from "../libs/formatters/media.js";
import type { ControllerSchema } from "../types.js";

const schema = {
	getMultiple: {
		query: {
			string: z
				.object({
					"filter[title]": queryString.schema.filter(false, "Thumbnail"),
					"filter[key]": queryString.schema.filter(false, "thumbnail-2022"),
					"filter[mimeType]": queryString.schema.filter(
						true,
						"image/png,image/jpg",
					),
					"filter[type]": queryString.schema.filter(true, "document"),
					"filter[extension]": queryString.schema.filter(true, "jpg,png"),
					sort: queryString.schema.sort(
						"createdAt,updatedAt,title,mimeType,extension",
					),
					include: queryString.schema.include("permissions"),
					page: queryString.schema.page,
					perPage: queryString.schema.perPage,
				})
				.meta(queryString.meta),
			formatted: z.object({
				filter: z
					.object({
						title: filterSchemas.single.optional(),
						key: filterSchemas.single.optional(),
						mimeType: filterSchemas.union.optional(),
						type: filterSchemas.union.optional(),
						extension: filterSchemas.union.optional(),
					})
					.optional(),
				sort: z
					.array(
						z.object({
							key: z.enum([
								"createdAt",
								"updatedAt",
								"title",
								"fileSize",
								"width",
								"height",
								"mimeType",
								"extension",
							]),
							value: z.enum(["asc", "desc"]),
						}),
					)
					.optional(),
				include: z.array(z.enum(["permissions"])).optional(),
				page: defaultQuery.page,
				perPage: defaultQuery.perPage,
			}),
		},
		params: undefined,
		body: undefined,
		response: MediaFormatter.schema.media,
	} satisfies ControllerSchema,
};

export type GetMultipleQueryParams = z.infer<
	typeof schema.getMultiple.query.formatted
>;

export default schema;
