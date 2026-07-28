import z from "zod";
import { resolvedAdminCopySchema } from "../libs/i18n/index.js";
import type { ControllerSchema } from "../types.js";
import { queryFormatted, queryString } from "./helpers/querystring.js";

const integrationScopeSchema = z.string().min(1);

export const integrationExpirySchema = z.enum([
	"never",
	"30-days",
	"90-days",
	"1-year",
]);

export const integrationResponseSchema = z.object({
	id: z.number().meta({
		description: "The integration ID",
		example: "26",
	}),
	key: z.string().meta({
		description: "A short unique key used to authenticate content API requests",
		example: "bd61bb",
	}),
	name: z.string().min(2).meta({
		description: "The name of the integration",
		example: "Marketing Website",
	}),
	description: z.string().nullable().meta({
		description: "A description of the integration",
		example: "The Astro marketing site at example.com",
	}),
	enabled: z.boolean().meta({
		description:
			"Whether the integration can authenticate external endpoint requests",
		example: true,
	}),
	userId: z.number().nullable().meta({
		description: "The user this integration acts as, or null for the system",
		example: 1,
	}),
	tenantKey: z.string().nullable().meta({
		description: "The tenant this integration is scoped to",
		example: "marketing",
	}),
	expiresAt: z.string().nullable().meta({
		description:
			"The time the integration expires, or null when it never expires",
		example: "2027-01-01T00:00:00Z",
	}),
	scopes: z.array(integrationScopeSchema).meta({
		description: "The scopes this integration has access to.",
		example: ["documents:pages:read", "media:read"],
	}),
	lastUsedAt: z.string().nullable().meta({
		description: "The time the integration was last used",
		example: "2022-01-01T00:00:00Z",
	}),
	lastUsedIp: z.string().nullable().meta({
		description: "The last IP address that used the integration",
		example: "203.0.113.42",
	}),
	lastUsedUserAgent: z.string().nullable().meta({
		description: "The last user agent that used the integration",
		example: "Mozilla/5.0",
	}),
	createdAt: z.string().nullable().meta({
		description: "The time the integration was created",
		example: "2022-01-01T00:00:00Z",
	}),
	updatedAt: z.string().nullable().meta({
		description: "The time the integration was last updated",
		example: "2022-01-01T00:00:00Z",
	}),
});

export const userIntegrationParamsSchema = z.object({
	userId: z.coerce.number().int().positive(),
});

export const userIntegrationItemParamsSchema =
	userIntegrationParamsSchema.extend({
		id: z.coerce.number().int().positive(),
	});

const integrationScopeGroupResponseSchema = z.object({
	key: z.string().meta({
		description: "The scope group key",
		example: "documents:pages",
	}),
	details: z.object({
		name: resolvedAdminCopySchema,
		description: resolvedAdminCopySchema.nullable().optional(),
	}),
	scopes: z
		.array(
			z.object({
				key: integrationScopeSchema,
				details: z.object({
					name: resolvedAdminCopySchema,
					description: resolvedAdminCopySchema.nullable().optional(),
				}),
			}),
		)
		.meta({
			description: "The scopes for this scope group",
		}),
});

export const controllerSchemas = {
	createSingle: {
		body: z.object({
			name: z.string().trim().min(2).meta({
				description: "The name of the integration",
				example: "Marketing Website",
			}),
			description: z
				.string()
				.trim()
				.meta({
					description: "A description of the integration",
					example: "The Astro marketing site at example.com",
				})
				.optional(),
			enabled: z
				.boolean()
				.meta({
					description:
						"Whether the integration can authenticate external endpoint requests",
					example: true,
				})
				.optional(),
			expiry: integrationExpirySchema.default("never").meta({
				description: "How long the integration should remain valid",
				example: "never",
			}),
			scopes: z.array(integrationScopeSchema).meta({
				description: "Scopes granted to this integration.",
				example: ["documents:pages:read"],
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
					"A unique token used to authenticate content endpoint requests. You'll only ever see this value once so keep it safe",
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
				description: "The integration ID you want to delete",
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
					"filter[key]": queryString.schema.filter(false, {
						example: "bd61bb",
					}),
					"filter[name]": queryString.schema.filter(false, {
						example: "Marketing Website",
					}),
					"filter[enabled]": queryString.schema.filter(false, {
						example: "1",
					}),
					"filter[expiresAt]": queryString.schema.filter(false, {
						example: "2027-01-01T00:00:00Z",
					}),
					"filter[description]": queryString.schema.filter(false, {
						example: "Marketing website",
					}),
					"filter[scope]": queryString.schema.filter(true, {
						example: "documents:pages:read",
					}),
					"filter[lastUsedAt]": queryString.schema.filter(false, {
						example: "2026-01-01T00:00:00Z",
					}),
					"filter[lastUsedIp]": queryString.schema.filter(false, {
						example: "203.0.113.42",
					}),
					"filter[createdAt]": queryString.schema.filter(false, {
						example: "2026-01-01T00:00:00Z",
					}),
					"filter[updatedAt]": queryString.schema.filter(false, {
						example: "2026-01-01T00:00:00Z",
					}),
					sort: queryString.schema.sort("name,description,enabled,createdAt"),
					page: queryString.schema.page,
					perPage: queryString.schema.perPage,
				})
				.meta(queryString.meta),
			formatted: z.object({
				filter: z
					.object({
						key: queryFormatted.schema.filters.single.optional(),
						name: queryFormatted.schema.filters.single.optional(),
						description: queryFormatted.schema.filters.single.optional(),
						enabled: queryFormatted.schema.filters.single.optional(),
						expiresAt: queryFormatted.schema.filters.single.optional(),
						scope: queryFormatted.schema.filters.union.optional(),
						lastUsedAt: queryFormatted.schema.filters.single.optional(),
						lastUsedIp: queryFormatted.schema.filters.single.optional(),
						createdAt: queryFormatted.schema.filters.single.optional(),
						updatedAt: queryFormatted.schema.filters.single.optional(),
					})
					.optional(),
				filterOr: queryFormatted.schema.filterOr,
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
							direction: z.enum(["asc", "desc"]),
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
		response: z.array(integrationResponseSchema),
	} satisfies ControllerSchema,
	getSingle: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: z.object({
			id: z.string().trim().meta({
				description: "The integration ID",
				example: "1",
			}),
		}),
		response: integrationResponseSchema,
	} satisfies ControllerSchema,
	getScopes: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: undefined,
		response: z.array(integrationScopeGroupResponseSchema),
	} satisfies ControllerSchema,
	regenerateKeys: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: z.object({
			id: z.string().trim().meta({
				description: "The integration ID",
				example: "1",
			}),
		}),
		response: z.object({
			apiKey: z.string().meta({
				description:
					"A unique token used to authenticate content endpoint requests. You'll only ever see this value once so keep it safe",
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
					description: "The name of the integration",
					example: "Marketing Website",
				})
				.optional(),
			description: z
				.string()
				.trim()
				.meta({
					description: "A description of the integration",
					example: "The Astro marketing site at example.com",
				})
				.optional(),
			enabled: z
				.boolean()
				.meta({
					description:
						"Whether the integration can authenticate external endpoint requests",
					example: true,
				})
				.optional(),
			expiry: integrationExpirySchema
				.meta({
					description: "How long the integration should remain valid",
					example: "90-days",
				})
				.optional(),
			scopes: z
				.array(integrationScopeSchema)
				.meta({
					description: "Scopes granted to this integration.",
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
				description: "The integration ID",
				example: "1",
			}),
		}),
		response: undefined,
	} satisfies ControllerSchema,
};

export type GetAllQueryParams = z.infer<
	typeof controllerSchemas.getAll.query.formatted
>;

export type IntegrationExpiry = z.infer<typeof integrationExpirySchema>;
