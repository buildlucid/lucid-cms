import z from "zod";
import type { ControllerSchema } from "../types.js";
import { queryFormatted, queryString } from "./helpers/querystring.js";

const publishRequestStatusSchema = z.enum([
	"pending",
	"approved",
	"rejected",
	"cancelled",
	"superseded",
]);

const publishRequestUserSchema = z
	.object({
		id: z.number(),
		email: z.string().nullable(),
		username: z.string().nullable(),
		firstName: z.string().nullable(),
		lastName: z.string().nullable(),
	})
	.nullable();

export const publishRequestResponseSchema = z.object({
	id: z.number(),
	collectionKey: z.string(),
	documentId: z.number(),
	target: z.string(),
	operationType: z.enum(["request", "direct"]),
	status: publishRequestStatusSchema,
	sourceVersionId: z.number(),
	sourceContentId: z.string(),
	snapshotVersionId: z.number(),
	isOutdated: z.boolean(),
	requestedBy: publishRequestUserSchema,
	requestComment: z.string().nullable(),
	decidedBy: publishRequestUserSchema,
	decisionComment: z.string().nullable(),
	decidedAt: z.string().nullable(),
	createdAt: z.string().nullable(),
	updatedAt: z.string().nullable(),
	permissions: z.object({
		review: z.boolean(),
	}),
	assignees: z.array(
		z.object({
			id: z.number(),
			user: z.object({
				id: z.number(),
				email: z.string().nullable(),
				username: z.string().nullable(),
				firstName: z.string().nullable(),
				lastName: z.string().nullable(),
			}),
			assignedBy: z.number().nullable(),
			assignedAt: z.string().nullable(),
		}),
	),
	events: z.array(
		z.object({
			id: z.number(),
			type: z.string(),
			userId: z.number().nullable(),
			comment: z.string().nullable(),
			metadata: z.record(z.string(), z.unknown()),
			createdAt: z.string().nullable(),
		}),
	),
});

export const controllerSchemas = {
	getMultiple: {
		body: undefined,
		query: {
			string: z
				.object({
					"filter[status]": queryString.schema.filter(false, {
						example: "pending",
					}),
					"filter[collectionKey]": queryString.schema.filter(false, {
						example: "page",
					}),
					"filter[documentId]": queryString.schema.filter(false, {
						example: "1",
					}),
					"filter[target]": queryString.schema.filter(false, {
						example: "production",
					}),
					"filter[assignedToMe]": queryString.schema.filter(false, {
						example: "true",
					}),
					"filter[requestedByMe]": queryString.schema.filter(false, {
						example: "true",
					}),
					sort: queryString.schema.sort("createdAt,updatedAt"),
					page: queryString.schema.page,
					perPage: queryString.schema.perPage,
				})
				.meta(queryString.meta),
			formatted: z.object({
				filter: z
					.object({
						status: queryFormatted.schema.filters.single.optional(),
						collectionKey: queryFormatted.schema.filters.single.optional(),
						documentId: queryFormatted.schema.filters.single.optional(),
						target: queryFormatted.schema.filters.single.optional(),
						assignedToMe: queryFormatted.schema.filters.single.optional(),
						requestedByMe: queryFormatted.schema.filters.single.optional(),
					})
					.optional(),
				sort: z
					.array(
						z.object({
							key: z.enum(["createdAt", "updatedAt"]),
							value: z.enum(["asc", "desc"]),
						}),
					)
					.optional(),
				page: queryFormatted.schema.page,
				perPage: queryFormatted.schema.perPage,
			}),
		},
		params: z.object({}),
		response: z.array(publishRequestResponseSchema),
	} satisfies ControllerSchema,
	getSingle: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: z.object({
			id: z.string().trim(),
		}),
		response: publishRequestResponseSchema,
	} satisfies ControllerSchema,
	decision: {
		body: z.object({
			comment: z.string().trim().optional(),
		}),
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: z.object({
			id: z.string().trim(),
		}),
		response: undefined,
	} satisfies ControllerSchema,
	getReviewers: {
		body: undefined,
		query: {
			string: z.object({
				collectionKey: z.string().trim(),
				target: z.string().trim(),
			}),
			formatted: undefined,
		},
		params: z.object({}),
		response: z.array(
			z.object({
				id: z.number(),
				email: z.string(),
				username: z.string(),
				firstName: z.string().nullable(),
				lastName: z.string().nullable(),
			}),
		),
	} satisfies ControllerSchema,
};

export type GetMultipleQueryParams = z.infer<
	typeof controllerSchemas.getMultiple.query.formatted
>;
