import z from "zod/v4";
import { queryFormatted, queryString } from "./helpers/querystring.js";
import type { ControllerSchema } from "../types.js";

const userResponsePermissionSchema = z.string().meta({
	description: "A permission identifier",
	example: "create_user",
});
const userResponseRoleSchema = z.object({
	id: z.number().meta({
		description: "The role ID",
		example: 1,
	}),
	name: z.string().meta({
		description: "The role name",
		example: "Admin",
	}),
});

export const userResponseSchema = z.object({
	id: z.number().meta({
		description: "The user's ID",
		example: 1,
	}),
	superAdmin: z.boolean().meta({
		description: "Whether the user is a superadmin.",
		example: true,
	}),
	email: z.email().meta({
		description: "The user's email address",
		example: "admin@lucidcms.io",
	}),
	username: z.string().meta({
		description: "The user's username",
		example: "admin",
	}),
	firstName: z.string().nullable().meta({
		description: "The user's first name",
		example: "John",
	}),
	lastName: z.string().nullable().meta({
		description: "The user's last name",
		example: "Smith",
	}),
	triggerPasswordReset: z.boolean().nullable().meta({
		description: "Should the UI force a password reset?",
		example: false,
	}),
	roles: z.array(userResponseRoleSchema).meta({
		description: "The user's roles",
	}),
	permissions: z.array(userResponsePermissionSchema),
	createdAt: z.string().nullable().meta({
		description: "The date the user was added",
		example: "2021-06-10T20:00:00.000Z",
	}),
	updatedAt: z.string().nullable().meta({
		description: "The date the user row was last updated",
		example: "2021-06-10T20:00:00.000Z",
	}),
});

export const controllerSchemas = {
	createSingle: {
		body: z.object({
			email: z.email().meta({
				description: "The user's email address",
				example: "admin@lucidcms.io",
			}),
			username: z.string().meta({
				description: "The user's username",
				example: "Admin",
			}),
			roleIds: z.array(z.number()).meta({
				description: "A list of role IDs to attach to the user",
				example: [1, 2],
			}),
			firstName: z
				.string()
				.meta({
					description: "The user's first name",
					example: "John",
				})
				.optional(),
			lastName: z
				.string()
				.meta({
					description: "The user's last name",
					example: "Smith",
				})
				.optional(),
			superAdmin: z
				.boolean()
				.meta({
					description: "Whether the user is a super admin or not",
					example: true,
				})
				.optional(),
		}),
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: undefined,
		response: userResponseSchema,
	} satisfies ControllerSchema,
	updateSingle: {
		body: z.object({
			roleIds: z
				.array(z.number())
				.meta({
					description: "A list of role IDs to attach to the user",
					example: [1, 2],
				})
				.optional(),
			superAdmin: z
				.boolean()
				.meta({
					description: "Whether the user is a super admin or not",
					example: true,
				})
				.optional(),
			triggerPasswordReset: z
				.boolean()
				.meta({
					description:
						"Whether the user should be forced to update their password in the UI",
					example: true,
				})
				.optional(),
			isDeleted: z
				.literal(false)
				.meta({
					description: "Restore a deleted user",
					example: false,
				})
				.optional(),
		}),
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: z.object({
			id: z.string().meta({
				description: "The user's ID",
				example: 1,
			}),
		}),
		response: undefined,
	} satisfies ControllerSchema,
	getSingle: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: z.object({
			id: z.string().meta({
				description: "The user's ID",
				example: 1,
			}),
		}),
		response: userResponseSchema,
	} satisfies ControllerSchema,
	getMultiple: {
		query: {
			string: z
				.object({
					"filter[firstName]": queryString.schema.filter(false, {
						example: "John",
					}),
					"filter[lastName]": queryString.schema.filter(false, {
						example: "Smith",
					}),
					"filter[email]": queryString.schema.filter(false, {
						example: "team@lucidjs.build",
					}),
					"filter[username]": queryString.schema.filter(false, {
						example: "admin",
					}),
					"filter[roleIds]": queryString.schema.filter(true, {
						example: "1,2,3",
					}),
					"filter[id]": queryString.schema.filter(true, {
						example: "1,2",
					}),
					sort: queryString.schema.sort(
						"createdAt,updatedAt,firstName,lastName,email,username",
					),
					include: queryString.schema.include("permissions"),
					page: queryString.schema.page,
					perPage: queryString.schema.perPage,
				})
				.meta(queryString.meta),
			formatted: z.object({
				filter: z
					.object({
						firstName: queryFormatted.schema.filters.single.optional(),
						lastName: queryFormatted.schema.filters.single.optional(),
						email: queryFormatted.schema.filters.single.optional(),
						username: queryFormatted.schema.filters.single.optional(),
						roleIds: queryFormatted.schema.filters.union.optional(),
						id: queryFormatted.schema.filters.union.optional(),
					})
					.optional(),
				sort: z
					.array(
						z.object({
							key: z.enum([
								"createdAt",
								"updatedAt",
								"firstName",
								"lastName",
								"email",
								"username",
							]),
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
		body: undefined,
		response: z.array(userResponseSchema),
	} satisfies ControllerSchema,
	deleteSingle: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: z.object({
			id: z.string().meta({
				description: "The user's ID",
				example: 1,
			}),
		}),
		response: undefined,
	} satisfies ControllerSchema,
};

export type GetMultipleQueryParams = z.infer<
	typeof controllerSchemas.getMultiple.query.formatted
>;
