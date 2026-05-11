import z from "zod";
import type { ControllerSchema } from "../types.js";
import { queryFormatted, queryString } from "./helpers/querystring.js";

const publishOperationStatusSchema = z.enum([
	"pending",
	"approved",
	"rejected",
	"cancelled",
	"superseded",
]);

const publishOperationExecutionStatusSchema = z.enum([
	"awaiting_approval",
	"scheduled",
	"executing",
	"executed",
	"failed",
	"cancelled",
]);

const publishOperationUserSchema = z
	.object({
		id: z.number(),
		email: z.string().nullable(),
		username: z.string().nullable(),
		firstName: z.string().nullable(),
		lastName: z.string().nullable(),
	})
	.nullable();

export const publishOperationResponseSchema = z.object({
	id: z.number(),
	collectionKey: z.string(),
	documentId: z.number(),
	target: z.string(),
	operationType: z.enum(["request", "direct"]),
	status: publishOperationStatusSchema,
	executionStatus: publishOperationExecutionStatusSchema,
	sourceVersionId: z.number(),
	sourceContentId: z.string(),
	snapshotVersionId: z.number(),
	isOutdated: z.boolean(),
	requestedBy: publishOperationUserSchema,
	requestComment: z.string().nullable(),
	decidedBy: publishOperationUserSchema,
	decisionComment: z.string().nullable(),
	decidedAt: z.string().nullable(),
	scheduledAt: z.string().nullable(),
	scheduledTimezone: z.string().nullable(),
	executedAt: z.string().nullable(),
	failedAt: z.string().nullable(),
	executionErrorMessage: z.string().nullable(),
	executionErrorData: z.record(z.string(), z.unknown()).nullable(),
	scheduledJobId: z.string().nullable(),
	createdAt: z.string().nullable(),
	updatedAt: z.string().nullable(),
	permissions: z.object({
		review: z.boolean(),
		cancel: z.boolean(),
		reschedule: z.boolean(),
		retry: z.boolean(),
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
					"filter[executionStatus]": queryString.schema.filter(false, {
						example: "scheduled",
					}),
					"filter[operationType]": queryString.schema.filter(false, {
						example: "request",
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
					sort: queryString.schema.sort(
						"createdAt,updatedAt,scheduledAt,executedAt,failedAt",
					),
					page: queryString.schema.page,
					perPage: queryString.schema.perPage,
				})
				.meta(queryString.meta),
			formatted: z.object({
				filter: z
					.object({
						status: queryFormatted.schema.filters.single.optional(),
						executionStatus: queryFormatted.schema.filters.single.optional(),
						operationType: queryFormatted.schema.filters.single.optional(),
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
							key: z.enum([
								"createdAt",
								"updatedAt",
								"scheduledAt",
								"executedAt",
								"failedAt",
							]),
							value: z.enum(["asc", "desc"]),
						}),
					)
					.optional(),
				page: queryFormatted.schema.page,
				perPage: queryFormatted.schema.perPage,
			}),
		},
		params: z.object({}),
		response: z.array(publishOperationResponseSchema),
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
		response: publishOperationResponseSchema,
	} satisfies ControllerSchema,
	decision: {
		body: z.object({
			comment: z.string().trim().optional(),
			scheduledAt: z.string().trim().nullable().optional(),
			scheduledTimezone: z.string().trim().nullable().optional(),
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
	reschedule: {
		body: z.object({
			scheduledAt: z.string().trim().nullable(),
			scheduledTimezone: z.string().trim().nullable(),
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
	retry: {
		body: z.object({}).optional(),
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
