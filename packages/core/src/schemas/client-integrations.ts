import z from "zod";
import { ClientScopes } from "../libs/permission/client-scopes.js";
import { ClientScopeGroups } from "../libs/permission/scopes.js";
import type { ControllerSchema } from "../types.js";
import { queryFormatted, queryString } from "./helpers/querystring.js";

const clientScopeSchema = z.enum([
	ClientScopes.DocumentsRead,
	ClientScopes.MediaRead,
	ClientScopes.MediaProcess,
	ClientScopes.LocalesRead,
] as const);

export const clientIntegrationResponseSchema = z.object({
	id: z.number().meta({
		description: "The client integration ID",
		example: "26",
	}),
	key: z.string().meta({
		description:
			"A short unique key used to authenticate client query requests",
		example: "bd61bb",
	}),
	name: z.string().min(2).meta({
		description: "The name of the client",
		example: "Marketing Website",
	}),
	description: z.string().nullable().meta({
		description: "A description of the client",
		example: "The Astro marketing site at example.com",
	}),
	enabled: z.boolean().meta({
		description:
			"Whether or not the client is active. If inactive you wont be able to use it to query data",
		example: true,
	}),
	scopes: z.array(clientScopeSchema).meta({
		description: "The scopes this client integration has access to.",
		example: ["documents:read", "media:read"],
	}),
	lastUsedAt: z.string().nullable().meta({
		description: "The time the client integration was last used",
		example: "2022-01-01T00:00:00Z",
	}),
	lastUsedIp: z.string().nullable().meta({
		description: "The last IP address that used the client integration",
		example: "203.0.113.42",
	}),
	lastUsedUserAgent: z.string().nullable().meta({
		description: "The last user agent that used the client integration",
		example: "Mozilla/5.0",
	}),
	createdAt: z.string().nullable().meta({
		description: "The time the client integration was created",
		example: "2022-01-01T00:00:00Z",
	}),
	updatedAt: z.string().nullable().meta({
		description: "The time the client integration was last updated",
		example: "2022-01-01T00:00:00Z",
	}),
});

const clientIntegrationScopeGroupResponseSchema = z.object({
	key: z
		.enum(
			Object.values(ClientScopeGroups).map((group) => group.key) as [
				string,
				...string[],
			],
		)
		.meta({
			description: "The scope group key",
			example: "media_scopes",
		}),
	scopes: z.array(clientScopeSchema).meta({
		description: "The scopes for this scope group",
		example: ["media:read", "media:process"],
	}),
});

export const controllerSchemas = {
	createSingle: {
		body: z.object({
			name: z.string().trim().min(2).meta({
				description: "The name of the client",
				example: "Marketing Website",
			}),
			description: z
				.string()
				.trim()
				.meta({
					description: "A description of the client",
					example: "The Astro marketing site at example.com",
				})
				.optional(),
			enabled: z
				.boolean()
				.meta({
					description:
						"Whether or not the client is active. If inactive you wont be able to use it to query data",
					example: true,
				})
				.optional(),
			scopes: z
				.array(clientScopeSchema)
				.min(1)
				.meta({
					description: "Scopes granted to this client integration.",
					example: ["documents:read"],
				}),
		}),
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: undefined,
		response: z.object({
			apiKey: z.string().meta({
				description:
					"A unique token used to authenticate client endpoint requests. You'll only ever see this value once so keep it safe",
				example:
					"3084d4531c41ca6db79f422a4426361176461667280556c333ffcff530486a1e",
			}),
		}),
	} satisfies ControllerSchema,
	deleteSingle: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: z.object({
			id: z.string().trim().meta({
				description: "The client integration ID you want to delete",
				example: "1",
			}),
		}),
		response: undefined,
	} satisfies ControllerSchema,
	getAll: {
		body: undefined,
		query: {
			string: z
				.object({
					"filter[name]": queryString.schema.filter(false, {
						example: "Marketing Website",
					}),
					"filter[enabled]": queryString.schema.filter(false, {
						example: "1",
					}),
					sort: queryString.schema.sort("name,description,enabled,createdAt"),
					page: queryString.schema.page,
					perPage: queryString.schema.perPage,
				})
				.meta(queryString.meta),
			formatted: z.object({
				filter: z
					.object({
						name: queryFormatted.schema.filters.single.optional(),
						enabled: queryFormatted.schema.filters.single.optional(),
					})
					.optional(),
				sort: z
					.array(
						z.object({
							key: z.enum([
								"name",
								"description",
								"enabled",
								"createdAt",
								"updatedAt",
							]),
							value: z.enum(["asc", "desc"]),
						}),
					)
					.optional(),
				page: queryFormatted.schema.page,
				perPage: queryFormatted.schema.perPage,
				include: z.array(z.string()).optional(),
				exclude: z.array(z.string()).optional(),
			}),
		},
		params: undefined,
		response: z.array(clientIntegrationResponseSchema),
	} satisfies ControllerSchema,
	getSingle: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: z.object({
			id: z.string().trim().meta({
				description: "The client integration ID",
				example: "1",
			}),
		}),
		response: clientIntegrationResponseSchema,
	} satisfies ControllerSchema,
	getScopes: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: undefined,
		response: z.array(clientIntegrationScopeGroupResponseSchema),
	} satisfies ControllerSchema,
	regenerateKeys: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: z.object({
			id: z.string().trim().meta({
				description: "The client integration ID",
				example: "1",
			}),
		}),
		response: z.object({
			apiKey: z.string().meta({
				description:
					"A unique token used to authenticate client endpoint requests. You'll only ever see this value once so keep it safe",
				example:
					"3084d4531c41ca6db79f422a4426361176461667280556c333ffcff530486a1e",
			}),
		}),
	} satisfies ControllerSchema,
	updateSingle: {
		body: z.object({
			name: z
				.string()
				.trim()
				.min(2)
				.meta({
					description: "The name of the client",
					example: "Marketing Website",
				})
				.optional(),
			description: z
				.string()
				.trim()
				.meta({
					description: "A description of the client",
					example: "The Astro marketing site at example.com",
				})
				.optional(),
			enabled: z
				.boolean()
				.meta({
					description:
						"Whether or not the client is active. If inactive you wont be able to use it to query data",
					example: true,
				})
				.optional(),
			scopes: z
				.array(clientScopeSchema)
				.meta({
					description: "Scopes granted to this client integration.",
					example: ["media:read", "media:process"],
				})
				.optional(),
		}),
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: z.object({
			id: z.string().trim().meta({
				description: "The client integration ID",
				example: "1",
			}),
		}),
		response: undefined,
	} satisfies ControllerSchema,
};

export type GetAllQueryParams = z.infer<
	typeof controllerSchemas.getAll.query.formatted
>;
