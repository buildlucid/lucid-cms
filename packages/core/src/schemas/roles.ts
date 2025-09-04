import z from "zod/v4";
import { queryFormatted, queryString } from "./helpers/querystring.js";
import type { ControllerSchema } from "../types.js";

const roleResponseSchema = z.object({
	id: z.number().meta({
		description: "The role ID",
		example: 1,
	}),
	name: z.string().meta({
		description: "The role's name",
		example: "Editors",
	}),
	description: z.string().nullable().meta({
		description: "The role's description",
		example: "Editor's can edit documents from any collection",
	}),
	permissions: z
		.array(
			z.object({
				id: z.number().meta({
					description: "The permission ID",
					example: 1,
				}),
				permission: z.string().meta({
					description: "The permission key",
					example: "create_user",
				}),
			}),
		)
		.meta({
			description: "A list of all of the roles permissions",
		})
		.optional(),

	createdAt: z.string().meta({
		description: "Creation timestamp",
		example: "2022-01-01T00:00:00Z",
	}),
	updatedAt: z.string().meta({
		description: "Last update timestamp",
		example: "2022-01-01T00:00:00Z",
	}),
});

export const controllerSchemas = {
	createSingle: {
		body: z.object({
			name: z.string().min(2).meta({
				description: "The role's name",
				example: "Editor",
			}),
			description: z
				.string()
				.meta({
					description: "A description for the role",
					example: "Editor's can edit documents from any collection",
				})
				.optional(),
			permissions: z.array(z.string()).meta({
				description: "A lit of permissions",
				example: ["create_user", "update_user"],
			}),
		}),
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: undefined,
		response: roleResponseSchema,
	} satisfies ControllerSchema,
	updateSingle: {
		body: z.object({
			name: z
				.string()
				.min(2)
				.meta({
					description: "The role's name",
					example: "Editor",
				})
				.optional(),
			description: z
				.string()
				.meta({
					description: "A description for the role",
					example: "Editor's can edit documents from any collection",
				})
				.optional(),
			permissions: z
				.array(z.string())
				.meta({
					description: "A lit of permissions",
					example: ["create_user", "update_user"],
				})
				.optional(),
		}),
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: z.object({
			id: z.string().meta({
				description: "The role's ID",
				example: 1,
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
			id: z.string().meta({
				description: "The role's ID",
				example: 1,
			}),
		}),
		response: undefined,
	} satisfies ControllerSchema,
	getMultiple: {
		body: undefined,
		query: {
			string: z
				.object({
					"filter[name]": queryString.schema.filter(false, {
						example: "Editor",
					}),
					"filter[roleIds]": queryString.schema.filter(true, {
						example: "1,2",
					}),
					sort: queryString.schema.sort("createdAt,name"),
					include: queryString.schema.include("permissions"),
					page: queryString.schema.page,
					perPage: queryString.schema.perPage,
				})
				.meta(queryString.meta),
			formatted: z.object({
				filter: z
					.object({
						name: queryFormatted.schema.filters.single.optional(),
						roleIds: queryFormatted.schema.filters.union.optional(),
					})
					.optional(),
				sort: z
					.array(
						z.object({
							key: z.enum(["createdAt", "name"]),
							value: z.enum(["asc", "desc"]),
						}),
					)
					.optional(),
				include: z.array(z.enum(["permissions"])).optional(),
				page: queryFormatted.schema.page,
				perPage: queryFormatted.schema.perPage,
			}),
		},
		params: undefined,
		response: z.array(roleResponseSchema),
	} satisfies ControllerSchema,
	getSingle: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: z.object({
			id: z.string().meta({
				description: "The role's ID",
				example: 1,
			}),
		}),
		response: roleResponseSchema,
	} satisfies ControllerSchema,
};

export type GetMultipleQueryParams = z.infer<
	typeof controllerSchemas.getMultiple.query.formatted
>;
