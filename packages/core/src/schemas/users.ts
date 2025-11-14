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
	superAdmin: z
		.boolean()
		.meta({
			description: "Whether the user is a superadmin.",
			example: true,
		})
		.optional(),
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
	isLocked: z
		.boolean()
		.meta({
			description: "If the user is locked from logging in",
			example: false,
		})
		.optional(),
	triggerPasswordReset: z
		.boolean()
		.nullable()
		.meta({
			description: "Should the UI force a password reset?",
			example: false,
		})
		.optional(),
	invitationAccepted: z
		.boolean()
		.meta({
			description: "If the user has accepted the invitation",
			example: true,
		})
		.optional(),
	roles: z
		.array(userResponseRoleSchema)
		.meta({
			description: "The user's roles",
		})
		.optional(),
	permissions: z.array(userResponsePermissionSchema).optional(),
	isDeleted: z.boolean().meta({
		description: "If the user is soft-deleted or not",
		example: true,
	}),
	deletedAt: z
		.string()
		.nullable()
		.meta({
			description: "The date the user was deleted",
			example: "2021-06-10T20:00:00.000Z",
		})
		.optional(),
	createdAt: z
		.string()
		.nullable()
		.meta({
			description: "The date the user was added",
			example: "2021-06-10T20:00:00.000Z",
		})
		.optional(),
	updatedAt: z
		.string()
		.nullable()
		.meta({
			description: "The date the user row was last updated",
			example: "2021-06-10T20:00:00.000Z",
		})
		.optional(),
	hasPassword: z
		.boolean()
		.meta({
			description: "Whether the user has a password set",
			example: true,
		})
		.optional(),
	authProviders: z
		.array(
			z.object({
				id: z
					.number()
					.meta({ description: "The auth provider link ID", example: 1 }),
				providerKey: z
					.string()
					.meta({ description: "The provider key", example: "github" }),
				providerUserId: z.string().meta({
					description: "The provider's user identifier for this user",
					example: "123456",
				}),
				linkedAt: z
					.string()
					.nullable()
					.meta({ description: "When the provider was linked", example: null }),
			}),
		)
		.meta({ description: "Actively linked auth providers for the user" })
		.optional(),
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
		response: undefined,
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
			isLocked: z
				.boolean()
				.meta({
					description: "Lock or unlock the user",
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
					"filter[isDeleted]": queryString.schema.filter(false, {
						example: "true",
					}),
					"filter[isLocked]": queryString.schema.filter(false, {
						example: "true",
					}),
					"filter[deletedBy]": queryString.schema.filter(true, {
						example: "1",
					}),
					sort: queryString.schema.sort(
						"createdAt,updatedAt,firstName,lastName,email,username,isLocked",
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
						isDeleted: queryFormatted.schema.filters.single.optional(),
						isLocked: queryFormatted.schema.filters.single.optional(),
						deletedBy: queryFormatted.schema.filters.union.optional(),
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
								"isLocked",
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
	restoreMultiple: {
		body: z.object({
			ids: z.array(z.number()).meta({
				description: "An array of user IDs you wish to restore",
				example: [1, 2, 3],
			}),
		}),
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: undefined,
		response: undefined,
	} satisfies ControllerSchema,
	unlinkAuthProvider: {
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
			providerId: z.string().min(1).meta({
				description: "The provider key you wish to unlink",
				example: "github",
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
				description: "The user's ID",
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
			id: z.string().meta({
				description: "The user's ID",
				example: 1,
			}),
		}),
		response: undefined,
	} satisfies ControllerSchema,
	resendInvitation: {
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
