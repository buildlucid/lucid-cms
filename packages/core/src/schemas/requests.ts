import z from "zod";
import type { ControllerSchema } from "../exports/types.js";
import { requestCommentResolutionSchema } from "../libs/db/tables/request-events.js";
import {
	requestStatusSchema,
	requestTypeSchema,
} from "../libs/db/tables/requests.js";
import { jobStatusSchema } from "../libs/jobs/payload.js";
import type { RequestEvent } from "../types/response.js";
import { queryFormatted, queryString } from "./helpers/querystring.js";
import { mediaImagePreviewResponseSchema } from "./media.js";
import { richTextJSONSchema } from "./shared/rich-text.js";

const requestUserSchema = z.object({
	id: z.number(),
	email: z.string().nullable(),
	username: z.string().nullable(),
	firstName: z.string().nullable(),
	lastName: z.string().nullable(),
	profilePicture: mediaImagePreviewResponseSchema.nullable(),
});

const requestEventBaseShape = {
	id: z.number(),
	user: requestUserSchema.nullable(),
	createdAt: z.string().nullable(),
	updatedAt: z.string().nullable(),
};

//* typed explicitly so the controller schemas stay small enough to emit
const requestEventSchema: z.ZodType<RequestEvent> = z.discriminatedUnion(
	"type",
	[
		z.object({
			...requestEventBaseShape,
			type: z.literal("comment"),
			body: richTextJSONSchema,
			resolution: requestCommentResolutionSchema.nullable(),
			resolvedBy: requestUserSchema.nullable(),
			replies: z.array(
				z.object({ ...requestEventBaseShape, body: richTextJSONSchema }),
			),
		}),
		z.object({
			...requestEventBaseShape,
			type: z.literal("approved"),
			body: richTextJSONSchema.nullable(),
		}),
		z.object({
			...requestEventBaseShape,
			type: z.literal("schedule_updated"),
			scheduledAt: z.string().nullable(),
			scheduledTimezone: z.string().nullable(),
		}),
		z.object({
			...requestEventBaseShape,
			type: z.literal("failed"),
			message: z.string(),
			requestDocumentId: z.number().nullable(),
			target: z.string().nullable(),
		}),
		z.object({
			...requestEventBaseShape,
			type: z.literal("target_published"),
			target: z.string(),
			requestDocumentId: z.number(),
			sourceRequestId: z.number().nullable(),
		}),
		z.object({
			...requestEventBaseShape,
			type: z.enum([
				"target_reviewed",
				"target_unreviewed",
				"target_added",
				"target_removed",
			]),
			target: z.string(),
			requestDocumentId: z.number(),
		}),
		z.object({
			...requestEventBaseShape,
			type: z.literal("workflow_updated"),
			stage: z.string(),
			requestDocumentId: z.number(),
		}),
		z.object({
			...requestEventBaseShape,
			type: z.literal("proposal_edited"),
			requestDocumentId: z.number(),
		}),
		z.object({
			...requestEventBaseShape,
			type: z.enum(["document_added", "document_removed"]),
			collectionKey: z.string(),
			documentId: z.number(),
		}),
		z.object({
			...requestEventBaseShape,
			type: z.enum(["reviewer_added", "reviewer_removed"]),
			reviewer: requestUserSchema.nullable(),
		}),
		z.object({
			...requestEventBaseShape,
			type: z.enum(["approval_dismissed", "completed", "closed", "reopened"]),
		}),
	],
);

const requestBlockersSchema = z.array(
	z.object({
		requestDocumentId: z.number().optional(),
		code: z.enum([
			"collection_unavailable",
			"migration_required",
			"collection_locked",
			"document_deleted",
			"source_missing",
			"no_targets",
			"target_unavailable",
			"workflow",
			"prerequisite",
			"review_required",
			"target_changed",
			"scheduling_unavailable",
			"check",
		]),
		target: z.string().optional(),
		required: z.string().optional(),
		message: z.string().optional().meta({
			description: "Explains a blocker reported by a request check hook",
		}),
	}),
);

const requestDocumentResponseSchema = z.object({
	id: z.number(),
	collectionKey: z.string(),
	documentId: z.number(),
	documentLabel: z.string().nullable(),
	source: z.string().meta({
		description:
			"Latest for a proposal, or the environment a snapshot came from",
	}),
	versionId: z.number().nullable().meta({
		description:
			"The request's own proposal or snapshot. Proposals are removed once completed",
	}),
	contentId: z.string().nullable().meta({
		description: "The content ID of versionId",
	}),
	approvedVersionId: z.number().nullable().meta({
		description: "The frozen snapshot that will be, or was, published",
	}),
	workflowStage: z.string().nullable(),
	targets: z.array(
		z.object({
			target: z.string(),
			versionId: z.number().nullable(),
			changed: z.boolean(),
			changedSinceCreation: z.boolean(),
			reviewed: z.boolean(),
			reviewedBy: requestUserSchema.nullable(),
			reviewedAt: z.string().nullable(),
		}),
	),
	blockers: requestBlockersSchema,
	permissions: z.object({ edit: z.boolean() }),
});

const requestResponseSchema = z.object({
	id: z.number(),
	type: requestTypeSchema.meta({
		description:
			"Publish requests move documents to environments. Create requests request one new document, created once completed",
	}),
	title: z.string(),
	description: richTextJSONSchema.nullable(),
	status: requestStatusSchema,
	approved: z.boolean().meta({
		description: "Whether the current revision of the request is approved",
	}),
	revision: z.number(),
	executionJobId: z.string().nullable(),
	createdBy: requestUserSchema.nullable(),
	approvedBy: requestUserSchema.nullable(),
	approvedAt: z.string().nullable(),
	scheduledAt: z.string().nullable(),
	scheduledTimezone: z.string().nullable(),
	failure: z.string().nullable(),
	failureRequestDocumentId: z.number().nullable(),
	failureTarget: z.string().nullable(),
	completedAt: z.string().nullable(),
	createdAt: z.string().nullable(),
	updatedAt: z.string().nullable(),
	reviewers: z.array(requestUserSchema),
	documents: z.array(requestDocumentResponseSchema),
	events: z.array(requestEventSchema),
	blockers: requestBlockersSchema,
	openComments: z.number().meta({
		description: "Comments still waiting to be resolved or closed",
	}),
	permissions: z.object({
		edit: z.boolean(),
		approve: z.boolean(),
		request: z.boolean(),
		reopen: z.boolean(),
	}),
});

const requestSummaryResponseSchema = requestResponseSchema
	.pick({
		id: true,
		type: true,
		title: true,
		status: true,
		approved: true,
		createdBy: true,
		reviewers: true,
		scheduledAt: true,
		scheduledTimezone: true,
		failure: true,
		completedAt: true,
		createdAt: true,
		updatedAt: true,
		permissions: true,
	})
	.extend({
		documents: z.array(
			requestDocumentResponseSchema
				.pick({
					id: true,
					collectionKey: true,
					documentId: true,
					source: true,
					versionId: true,
				})
				.extend({ targets: z.array(z.string()) }),
		),
	});

const requestOverviewCountsSchema = z.object({
	awaitingApproval: z.number(),
	approved: z.number(),
	scheduled: z.number(),
	failed: z.number(),
	assignedToMe: z.number(),
});

export const requestOverviewResponseSchema = z.object({
	publish: requestOverviewCountsSchema.meta({
		description: "Open requests publishing existing documents",
	}),
	create: requestOverviewCountsSchema.meta({
		description: "Open requests requesting new documents",
	}),
});

const requestDocumentInputSchema = z.object({
	collectionKey: z.string().trim().min(1),
	documentId: z.number().int().positive(),
	source: z.string().trim().min(1).meta({
		description:
			"Starting source: latest or a configured environment. Fixed after creation.",
		example: "latest",
	}),
	targets: z
		.array(
			z
				.string()
				.trim()
				.min(1)
				.refine(
					(target) => target !== "latest",
					"Latest is edited independently and cannot be a request destination.",
				),
		)
		.min(1)
		.meta({
			description: "Selected publication environments.",
			example: ["staging"],
		}),
});

const scheduleShape = {
	scheduledAt: z.iso.datetime().nullable().optional().meta({
		description: "When to request once approved. Null removes the schedule",
		example: "2026-10-12T09:00:00.000Z",
	}),
	scheduledTimezone: z.string().trim().min(1).nullable().optional().meta({
		example: "Europe/London",
	}),
};

const requestParams = z.object({
	id: z.string().regex(/^\d+$/).meta({
		description: "The request ID",
		example: "1",
	}),
});
const requestDocumentParams = requestParams.extend({
	requestDocumentId: z.string().regex(/^\d+$/).meta({
		description: "The request document ID",
		example: "1",
	}),
});
const commentParams = requestParams.extend({
	eventId: z.string().regex(/^\d+$/).meta({
		description: "The comment ID",
		example: "1",
	}),
});
const noQuery = { string: undefined, formatted: undefined };

export const controllerSchemas = {
	getMultiple: {
		body: undefined,
		query: {
			string: z
				.object({
					"filter[type]": queryString.schema.filter(false, {
						example: "create",
					}),
					"filter[title]": queryString.schema.filter(false, {
						example: "Spring launch",
					}),
					"filter[status]": queryString.schema.filter(true, {
						example: "open",
					}),
					"filter[approval]": queryString.schema.filter(false, {
						example: "approved",
						description: "approved or pending",
					}),
					"filter[scheduled]": queryString.schema.filter(false, {
						example: "true",
					}),
					"filter[failed]": queryString.schema.filter(false, {
						example: "true",
					}),
					"filter[assignedToMe]": queryString.schema.filter(false, {
						example: "true",
					}),
					"filter[involvesMe]": queryString.schema.filter(false, {
						example: "true",
						description: "Requests you review or created",
					}),
					"filter[createdBy]": queryString.schema.filter(true, {
						example: "1",
					}),
					"filter[collectionKey]": queryString.schema.filter(false, {
						example: "page",
					}),
					"filter[documentId]": queryString.schema.filter(false, {
						example: "1",
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
					sort: queryString.schema.sort("createdAt,updatedAt,scheduledAt"),
					page: queryString.schema.page,
					perPage: queryString.schema.perPage,
				})
				.meta(queryString.meta),
			formatted: z.object({
				filter: z
					.object({
						type: queryFormatted.schema.filters.single.optional(),
						title: queryFormatted.schema.filters.single.optional(),
						status: queryFormatted.schema.filters.union.optional(),
						approval: queryFormatted.schema.filters.single.optional(),
						scheduled: queryFormatted.schema.filters.single.optional(),
						failed: queryFormatted.schema.filters.single.optional(),
						assignedToMe: queryFormatted.schema.filters.single.optional(),
						involvesMe: queryFormatted.schema.filters.single.optional(),
						createdBy: queryFormatted.schema.filters.union.optional(),
						collectionKey: queryFormatted.schema.filters.single.optional(),
						documentId: queryFormatted.schema.filters.single.optional(),
						createdAt: queryFormatted.schema.filters.single.optional(),
						updatedAt: queryFormatted.schema.filters.single.optional(),
						scheduledAt: queryFormatted.schema.filters.single.optional(),
					})
					.optional(),
				filterOr: queryFormatted.schema.filterOr,
				sort: z
					.array(
						z.object({
							key: z.enum(["createdAt", "updatedAt", "scheduledAt"]),
							direction: z.enum(["asc", "desc"]),
						}),
					)
					.optional(),
				page: queryFormatted.schema.page,
				perPage: queryFormatted.schema.perPage,
			}),
		},
		params: undefined,
		response: z.array(requestSummaryResponseSchema),
	} satisfies ControllerSchema,
	getOverview: {
		body: undefined,
		query: noQuery,
		params: undefined,
		response: requestOverviewResponseSchema,
	} satisfies ControllerSchema,
	getSingle: {
		body: undefined,
		query: noQuery,
		params: requestParams,
		response: requestResponseSchema,
	} satisfies ControllerSchema,
	getReviewers: {
		body: undefined,
		query: noQuery,
		params: requestParams,
		response: z.array(requestUserSchema),
	} satisfies ControllerSchema,
	getMentionableUsers: {
		body: undefined,
		query: noQuery,
		params: requestParams,
		response: z.array(requestUserSchema),
	} satisfies ControllerSchema,
	getExecution: {
		body: undefined,
		query: noQuery,
		params: requestParams,
		response: z
			.object({
				jobId: z.string(),
				status: jobStatusSchema,
				runAt: z.string().nullable(),
				error: z.string().nullable(),
			})
			.nullable(),
	} satisfies ControllerSchema,
	createSingle: {
		body: z.object({
			title: z.string().trim().min(1).max(200),
			description: richTextJSONSchema.nullable().optional(),
			documents: z.array(requestDocumentInputSchema).min(1),
			reviewerIds: z.array(z.number().int().positive()).optional(),
		}),
		query: noQuery,
		params: undefined,
		response: z.object({
			id: z.number().meta({
				description: "The new request's ID",
				example: 1,
			}),
		}),
	} satisfies ControllerSchema,
	updateSingle: {
		body: z.object({
			title: z.string().trim().min(1).max(200).optional(),
			description: richTextJSONSchema.nullable().optional(),
			reviewerIds: z.array(z.number().int().positive()).optional(),
			...scheduleShape,
		}),
		query: noQuery,
		params: requestParams,
		response: undefined,
	} satisfies ControllerSchema,
	addDocuments: {
		body: z.object({
			documents: z.array(requestDocumentInputSchema).min(1),
		}),
		query: noQuery,
		params: requestParams,
		response: undefined,
	} satisfies ControllerSchema,
	removeDocument: {
		body: undefined,
		query: noQuery,
		params: requestDocumentParams,
		response: undefined,
	} satisfies ControllerSchema,
	updateTargets: {
		body: z.object({ targets: requestDocumentInputSchema.shape.targets }),
		query: noQuery,
		params: requestDocumentParams,
		response: undefined,
	} satisfies ControllerSchema,
	reviewTarget: {
		body: z.object({
			target: z.string().min(1),
			revision: z.number().int().positive(),
			targetVersionId: z.number().int().positive().nullable(),
			reviewed: z.boolean(),
		}),
		query: noQuery,
		params: requestDocumentParams,
		response: undefined,
	} satisfies ControllerSchema,
	approve: {
		body: z.object({
			body: richTextJSONSchema.optional(),
			revision: z.number().int().positive(),
			expectedTargets: z.record(
				z.string(),
				z.record(z.string(), z.number().int().positive().nullable()),
			),
		}),
		query: noQuery,
		params: requestParams,
		response: undefined,
	} satisfies ControllerSchema,
	complete: {
		body: undefined,
		query: noQuery,
		params: requestParams,
		response: z.object({ jobId: z.string() }),
	} satisfies ControllerSchema,
	unapprove: {
		body: undefined,
		query: noQuery,
		params: requestParams,
		response: undefined,
	} satisfies ControllerSchema,
	close: {
		body: undefined,
		query: noQuery,
		params: requestParams,
		response: undefined,
	} satisfies ControllerSchema,
	reopen: {
		body: undefined,
		query: noQuery,
		params: requestParams,
		response: undefined,
	} satisfies ControllerSchema,
	createComment: {
		body: z.object({
			body: richTextJSONSchema,
			parentId: z.number().optional().meta({
				description: "The comment to reply to. Replies go one level deep",
				example: 1,
			}),
		}),
		query: noQuery,
		params: requestParams,
		response: undefined,
	} satisfies ControllerSchema,
	updateComment: {
		body: z.object({ body: richTextJSONSchema }),
		query: noQuery,
		params: commentParams,
		response: undefined,
	} satisfies ControllerSchema,
	updateCommentResolution: {
		body: z.object({ resolution: requestCommentResolutionSchema.nullable() }),
		query: noQuery,
		params: commentParams,
		response: undefined,
	} satisfies ControllerSchema,
	deleteComment: {
		body: undefined,
		query: noQuery,
		params: commentParams,
		response: undefined,
	} satisfies ControllerSchema,
};

export type GetMultipleQueryParams = z.infer<
	typeof controllerSchemas.getMultiple.query.formatted
>;
export type RequestDocumentInput = z.infer<typeof requestDocumentInputSchema>;
