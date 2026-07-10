import z from "zod";
import type { ControllerSchema } from "../types.js";
import { queryFormatted, queryString } from "./helpers/querystring.js";
import { mediaEmbedResponseSchema } from "./media.js";

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
		profilePicture: mediaEmbedResponseSchema.nullable(),
	})
	.nullable();

export const publishOperationResponseSchema = z.object({
	id: z.number(),
	collectionKey: z.string(),
	documentId: z.number(),
	documentLabel: z.string().nullable(),
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
		updateReviewers: z.boolean(),
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
				profilePicture: mediaEmbedResponseSchema.nullable(),
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

const publishOperationOverviewResponseSchema = z.object({
	total: z.number(),
	pending: z.number(),
	assignedToMe: z.number(),
	requestedByMe: z.number(),
	scheduled: z.number(),
	approved: z.number(),
	rejected: z.number(),
	failed: z.number(),
});

export const controllerSchemas = {
	getMultiple: {
		body: undefined,
		query: {
			string: z
				.object({
					"filter[status]": queryString.schema.filter(true, {
						example: "pending",
					}),
					"filter[executionStatus]": queryString.schema.filter(true, {
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
					"filter[requestedBy]": queryString.schema.filter(true, {
						example: "1,2",
					}),
					"filter[reviewers]": queryString.schema.filter(true, {
						example: "1,2",
					}),
					"filter[assignedToMe]": queryString.schema.filter(false, {
						example: "true",
					}),
					"filter[requestedByMe]": queryString.schema.filter(false, {
						example: "true",
					}),
					"filter[createdAt]": queryString.schema.filter(false, {
						example: "2026-01-01T00:00:00Z",
					}),
					"filter[updatedAt]": queryString.schema.filter(false, {
						example: "2026-01-01T00:00:00Z",
					}),
					"filter[scheduledAt]": queryString.schema.filter(false, {
						example: "2026-01-01T00:00:00Z",
					}),
					"filter[executedAt]": queryString.schema.filter(false, {
						example: "2026-01-01T00:00:00Z",
					}),
					"filter[failedAt]": queryString.schema.filter(false, {
						example: "2026-01-01T00:00:00Z",
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
						status: queryFormatted.schema.filters.union.optional(),
						executionStatus: queryFormatted.schema.filters.union.optional(),
						operationType: queryFormatted.schema.filters.single.optional(),
						collectionKey: queryFormatted.schema.filters.single.optional(),
						documentId: queryFormatted.schema.filters.single.optional(),
						target: queryFormatted.schema.filters.single.optional(),
						requestedBy: queryFormatted.schema.filters.union.optional(),
						reviewers: queryFormatted.schema.filters.union.optional(),
						assignedToMe: queryFormatted.schema.filters.single.optional(),
						requestedByMe: queryFormatted.schema.filters.single.optional(),
						createdAt: queryFormatted.schema.filters.single.optional(),
						updatedAt: queryFormatted.schema.filters.single.optional(),
						scheduledAt: queryFormatted.schema.filters.single.optional(),
						executedAt: queryFormatted.schema.filters.single.optional(),
						failedAt: queryFormatted.schema.filters.single.optional(),
					})
					.optional(),
				filterOr: queryFormatted.schema.filterOr,
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
							direction: z.enum(["asc", "desc"]),
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
	getOverview: {
		body: undefined,
		query: {
			string: z
				.object({
					"filter[collectionKey]": queryString.schema.filter(false, {
						example: "page",
					}),
					"filter[target]": queryString.schema.filter(false, {
						example: "production",
					}),
				})
				.meta(queryString.meta),
			formatted: z.object({
				filter: z
					.object({
						collectionKey: queryFormatted.schema.filters.single.optional(),
						target: queryFormatted.schema.filters.single.optional(),
					})
					.optional(),
				filterOr: queryFormatted.schema.filterOr,
			}),
		},
		params: z.object({}),
		response: publishOperationOverviewResponseSchema,
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
	updateReviewers: {
		body: z.object({
			assigneeIds: z.array(z.number()).optional(),
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
				profilePicture: mediaEmbedResponseSchema.nullable(),
			}),
		),
	} satisfies ControllerSchema,
};

export type GetMultipleQueryParams = z.infer<
	typeof controllerSchemas.getMultiple.query.formatted
>;

export type GetOverviewQueryParams = z.infer<
	typeof controllerSchemas.getOverview.query.formatted
>;
