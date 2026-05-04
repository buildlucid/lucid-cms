import z from "zod";
import type { ControllerSchema } from "../types.js";
import { queryFormatted, queryString } from "./helpers/querystring.js";

const roleTranslationSchema = z.object({
	localeCode: z.string().trim().meta({
		description: "The admin UI locale code for the translated role label",
		example: "en",
	}),
	value: z.string().trim().nullable().meta({
		description: "The translated value",
		example: "Editors",
	}),
});

const roleResponseSchema = z.object({
	id: z.number().meta({
		description: "The role ID",
		example: 1,
	}),
	key: z.string().nullable().meta({
		description:
			"The config-managed role key, if this role is managed by config",
		example: "content-admin",
	}),
	name: z.array(roleTranslationSchema).meta({
		description: "Internal admin UI translations for the role name",
	}),
	description: z.array(roleTranslationSchema).meta({
		description: "Internal admin UI translations for the role description",
	}),
	locked: z.boolean().meta({
		description: "Whether this role is managed by config and cannot be edited",
		example: false,
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
					example: "users:create",
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
			name: z.array(roleTranslationSchema).meta({
				description: "Internal admin UI translations for the role name",
			}),
			description: z.array(roleTranslationSchema).optional().meta({
				description: "Internal admin UI translations for the role description",
			}),
			permissions: z.array(z.string().trim()).meta({
				description: "A lit of permissions",
				example: ["users:create", "users:update"],
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
				.array(roleTranslationSchema)
				.meta({
					description: "Internal admin UI translations for the role name",
				})
				.optional(),
			description: z
				.array(roleTranslationSchema)
				.meta({
					description:
						"Internal admin UI translations for the role description",
				})
				.optional(),
			permissions: z
				.array(z.string().trim())
				.meta({
					description: "A lit of permissions",
					example: ["users:create", "users:update"],
				})
				.optional(),
		}),
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: z.object({
			id: z.string().trim().meta({
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
			id: z.string().trim().meta({
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
			id: z.string().trim().meta({
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
