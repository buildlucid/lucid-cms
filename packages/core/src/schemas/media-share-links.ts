import z from "zod/v4";
import type { ControllerSchema } from "../types.js";
import { queryFormatted, queryString } from "./helpers/querystring.js";

export const tokenSchema = z
	.string()
	.length(12)
	.regex(/^[A-Za-z0-9_-]+$/, "Invalid token format");

export const mediaShareLinkResponseSchema = z.object({
	id: z.number().meta({ description: "Share link ID", example: 1 }),
	token: z.string().meta({
		description: "Unique token identifying the share link",
		example: "a1B2c3D4e5F6",
	}),
	url: z.string().meta({
		description: "Public share URL",
		example: "https://example.com/share/a1B2c3D4e5F6",
	}),
	name: z.string().nullable().meta({
		description: "Optional display name",
		example: "Client preview",
	}),
	description: z.string().nullable().meta({
		description: "Optional description",
		example: "Preview link for the client review",
	}),
	expiresAt: z.string().nullable().meta({
		description: "ISO date string when the link expires",
		example: "2025-01-01T00:00:00Z",
	}),
	hasExpired: z.boolean().meta({
		description: "Whether the link has expired based on the current date",
		example: false,
	}),
	hasPassword: z.boolean().meta({
		description: "Whether a password is set for this link",
		example: true,
	}),
	createdBy: z.number().nullable().meta({
		description: "User ID that created the link",
		example: 1,
	}),
	updatedBy: z.number().nullable().meta({
		description: "User ID that last updated the link",
		example: 1,
	}),
	createdAt: z.string().nullable().meta({
		description: "Creation timestamp",
		example: "2022-01-01T00:00:00Z",
	}),
	updatedAt: z.string().nullable().meta({
		description: "Last update timestamp",
		example: "2022-01-01T00:00:00Z",
	}),
});

export const controllerSchemas = {
	getMultiple: {
		body: undefined,
		query: {
			string: z
				.object({
					"filter[token]": queryString.schema.filter(false, {
						example: "a1B2c3D4e5F6",
					}),
					"filter[name]": queryString.schema.filter(false, {
						example: "Client preview",
					}),
					"filter[createdBy]": queryString.schema.filter(true, {
						example: "1",
					}),
					"filter[updatedBy]": queryString.schema.filter(true, {
						example: "1",
					}),
					sort: queryString.schema.sort("name,expiresAt,createdAt,updatedAt"),
					page: queryString.schema.page,
					perPage: queryString.schema.perPage,
				})
				.meta(queryString.meta),
			formatted: z.object({
				filter: z
					.object({
						token: queryFormatted.schema.filters.single.optional(),
						name: queryFormatted.schema.filters.single.optional(),
						createdBy: queryFormatted.schema.filters.union.optional(),
						updatedBy: queryFormatted.schema.filters.union.optional(),
					})
					.optional(),
				sort: z
					.array(
						z.object({
							key: z.enum(["name", "expiresAt", "createdAt", "updatedAt"]),
							value: z.enum(["asc", "desc"]),
						}),
					)
					.optional(),
				page: queryFormatted.schema.page,
				perPage: queryFormatted.schema.perPage,
			}),
		},
		params: z.object({
			id: z.string().meta({
				description: "The media ID",
				example: 1,
			}),
		}),
		response: z.array(mediaShareLinkResponseSchema),
	} satisfies ControllerSchema,
	createSingle: {
		body: z.object({
			name: z
				.string()
				.min(1)
				.meta({ description: "Optional display name" })
				.optional(),
			description: z
				.string()
				.meta({ description: "Optional description" })
				.optional(),
			password: z
				.string()
				.min(1)
				.meta({ description: "Optional password to protect the link" })
				.optional(),
			expiresAt: z
				.string()
				.meta({
					description: "Optional expiry date",
					example: "2025-01-01T00:00:00Z",
				})
				.optional(),
		}),
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: z.object({
			id: z.string().meta({ description: "The media ID", example: 1 }),
		}),
		response: mediaShareLinkResponseSchema,
	} satisfies ControllerSchema,
	updateSingle: {
		body: z.object({
			name: z
				.string()
				.meta({ description: "Optional display name" })
				.optional(),
			description: z
				.string()
				.meta({ description: "Optional description" })
				.optional(),
			password: z
				.union([z.string().min(0), z.null()])
				.meta({ description: "Set a password or null to clear" })
				.optional(),
			expiresAt: z
				.union([z.string(), z.null()])
				.meta({
					description: "Expiry date or null to clear",
					example: "2025-01-01T00:00:00Z",
				})
				.optional(),
		}),
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: z.object({
			id: z.string().meta({ description: "The media ID", example: 1 }),
			linkId: z.string().meta({ description: "The share link ID", example: 1 }),
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
			id: z.string().meta({ description: "The media ID", example: 1 }),
			linkId: z.string().meta({ description: "The share link ID", example: 1 }),
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
			id: z.string().meta({ description: "The media ID", example: 1 }),
			linkId: z.string().meta({ description: "The share link ID", example: 1 }),
		}),
		response: mediaShareLinkResponseSchema,
	} satisfies ControllerSchema,
	deleteMultiple: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: z.object({
			id: z.string().meta({ description: "The media ID", example: 1 }),
		}),
		response: undefined,
	} satisfies ControllerSchema,
	deleteAll: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: undefined,
		response: undefined,
	} satisfies ControllerSchema,
};

export type GetMultipleShareLinksQueryParams = z.infer<
	typeof controllerSchemas.getMultiple.query.formatted
>;
