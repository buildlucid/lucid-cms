import z from "zod/v4";
import { queryFormatted, queryString } from "./helpers/querystring.js";
import type { ControllerSchema } from "../types.js";

const userLoginResponseSchema = z.object({
	id: z.number().meta({
		description: "The user login ID",
		example: 1,
	}),
	userId: z.number().nullable().meta({
		description: "The ID of the user who logged in",
		example: 1,
	}),
	tokenId: z.number().nullable().meta({
		description: "The ID of the refresh token created during login",
		example: 123,
	}),
	authMethod: z.string().meta({
		description: "The authentication method used",
		example: "password",
	}),
	ipAddress: z.string().nullable().meta({
		description: "The IP address from which the login originated",
		example: "192.168.1.1",
	}),
	userAgent: z.string().nullable().meta({
		description: "The user agent string from the login request",
		example: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
	}),
	createdAt: z.string().nullable().meta({
		description: "Timestamp when the login occurred",
		example: "2024-04-25T14:30:00.000Z",
	}),
});

export const controllerSchemas = {
	getMultiple: {
		body: undefined,
		query: {
			string: z
				.object({
					"filter[authMethod]": queryString.schema.filter(true, {
						example: "password",
					}),
					"filter[ipAddress]": queryString.schema.filter(false, {
						example: "192.168.1.1",
					}),
					sort: queryString.schema.sort("createdAt"),
					page: queryString.schema.page,
					perPage: queryString.schema.perPage,
				})
				.meta(queryString.meta),
			formatted: z.object({
				filter: z
					.object({
						authMethod: queryFormatted.schema.filters.union.optional(),
						ipAddress: queryFormatted.schema.filters.single.optional(),
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
				page: queryFormatted.schema.page,
				perPage: queryFormatted.schema.perPage,
			}),
		},
		params: z.object({
			id: z.string().meta({
				description: "The user ID to fetch logins for",
				example: "1",
			}),
		}),
		response: z.array(userLoginResponseSchema),
	} satisfies ControllerSchema,
};

export type GetMultipleQueryParams = z.infer<
	typeof controllerSchemas.getMultiple.query.formatted
>;
