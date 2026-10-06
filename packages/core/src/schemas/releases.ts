import z from "zod";
import type { ControllerSchema } from "../exports/types.js";
import { releaseCommentResolutionSchema } from "../libs/db/tables/release-events.js";
import {
	releaseStatusSchema,
	releaseTypeSchema,
} from "../libs/db/tables/releases.js";
import { jobStatusSchema } from "../libs/jobs/payload.js";
import type { ReleaseEvent } from "../types/response.js";
import { queryFormatted, queryString } from "./helpers/querystring.js";
import { mediaImagePreviewResponseSchema } from "./media.js";
import { richTextJSONSchema } from "./shared/rich-text.js";

const releaseUserSchema = z.object({
	id: z.number(),
	email: z.string().nullable(),
	username: z.string().nullable(),
	firstName: z.string().nullable(),
	lastName: z.string().nullable(),
	profilePicture: mediaImagePreviewResponseSchema.nullable(),
});

const releaseEventBaseShape = {
	id: z.number(),
	user: releaseUserSchema.nullable(),
	createdAt: z.string().nullable(),
	updatedAt: z.string().nullable(),
};

//* typed explicitly so the controller schemas stay small enough to emit
const releaseEventSchema: z.ZodType<ReleaseEvent> = z.discriminatedUnion(
	"type",
	[
		z.object({
			...releaseEventBaseShape,
			type: z.literal("comment"),
			body: richTextJSONSchema,
			resolution: releaseCommentResolutionSchema.nullable(),
			resolvedBy: releaseUserSchema.nullable(),
			replies: z.array(
				z.object({ ...releaseEventBaseShape, body: richTextJSONSchema }),
			),
		}),
		z.object({
			...releaseEventBaseShape,
			type: z.literal("approved"),
			body: richTextJSONSchema.nullable(),
		}),
		z.object({
			...releaseEventBaseShape,
			type: z.literal("schedule_updated"),
			scheduledAt: z.string().nullable(),
			scheduledTimezone: z.string().nullable(),
		}),
		z.object({
			...releaseEventBaseShape,
			type: z.literal("failed"),
			message: z.string(),
			releaseDocumentId: z.number().nullable(),
			target: z.string().nullable(),
		}),
		z.object({
			...releaseEventBaseShape,
			type: z.literal("target_published"),
			target: z.string(),
			releaseDocumentId: z.number(),
			sourceReleaseId: z.number().nullable(),
		}),
		z.object({
			...releaseEventBaseShape,
			type: z.enum([
				"target_reviewed",
				"target_unreviewed",
				"target_added",
				"target_removed",
			]),
			target: z.string(),
			releaseDocumentId: z.number(),
		}),
		z.object({
			...releaseEventBaseShape,
			type: z.literal("workflow_updated"),
			stage: z.string(),
			releaseDocumentId: z.number(),
		}),
		z.object({
			...releaseEventBaseShape,
			type: z.literal("proposal_edited"),
			releaseDocumentId: z.number(),
		}),
		z.object({
			...releaseEventBaseShape,
			type: z.enum(["document_added", "document_removed"]),
			collectionKey: z.string(),
			documentId: z.number(),
		}),
		z.object({
			...releaseEventBaseShape,
			type: z.enum(["reviewer_added", "reviewer_removed"]),
			reviewer: releaseUserSchema.nullable(),
		}),
		z.object({
			...releaseEventBaseShape,
			type: z.enum(["approval_dismissed", "released", "closed", "reopened"]),
		}),
	],
);

const releaseBlockersSchema = z.array(
	z.object({
		releaseDocumentId: z.number().optional(),
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
			description: "Explains a blocker reported by a release check hook",
		}),
	}),
);

const releaseDocumentResponseSchema = z.object({
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
			"The release's own proposal or snapshot. Proposals are removed once released",
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
			reviewedBy: releaseUserSchema.nullable(),
			reviewedAt: z.string().nullable(),
		}),
	),
	blockers: releaseBlockersSchema,
	permissions: z.object({ edit: z.boolean() }),
});

const releaseResponseSchema = z.object({
	id: z.number(),
	type: releaseTypeSchema.meta({
		description:
			"Publish releases move documents to environments. Create releases request one new document, created once released",
	}),
	title: z.string(),
	description: richTextJSONSchema.nullable(),
	status: releaseStatusSchema,
	approved: z.boolean().meta({
		description: "Whether the current revision of the release is approved",
	}),
	revision: z.number(),
	executionJobId: z.string().nullable(),
	createdBy: releaseUserSchema.nullable(),
	approvedBy: releaseUserSchema.nullable(),
	approvedAt: z.string().nullable(),
	scheduledAt: z.string().nullable(),
	scheduledTimezone: z.string().nullable(),
	failure: z.string().nullable(),
	failureReleaseDocumentId: z.number().nullable(),
	failureTarget: z.string().nullable(),
	releasedAt: z.string().nullable(),
	createdAt: z.string().nullable(),
	updatedAt: z.string().nullable(),
	reviewers: z.array(releaseUserSchema),
	documents: z.array(releaseDocumentResponseSchema),
	events: z.array(releaseEventSchema),
	blockers: releaseBlockersSchema,
	openComments: z.number().meta({
		description: "Comments still waiting to be resolved or closed",
	}),
	permissions: z.object({
		edit: z.boolean(),
		approve: z.boolean(),
		release: z.boolean(),
		reopen: z.boolean(),
	}),
});

const releaseSummaryResponseSchema = releaseResponseSchema
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
		releasedAt: true,
		createdAt: true,
		updatedAt: true,
		permissions: true,
	})
	.extend({
		documents: z.array(
			releaseDocumentResponseSchema
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

const releaseOverviewCountsSchema = z.object({
	awaitingApproval: z.number(),
	approved: z.number(),
	scheduled: z.number(),
	failed: z.number(),
	assignedToMe: z.number(),
});

export const releaseOverviewResponseSchema = z.object({
	publish: releaseOverviewCountsSchema.meta({
		description: "Open releases publishing existing documents",
	}),
	create: releaseOverviewCountsSchema.meta({
		description: "Open releases requesting new documents",
	}),
});

const releaseDocumentInputSchema = z.object({
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
					"Latest is edited independently and cannot be a release destination.",
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
		description: "When to release once approved. Null removes the schedule",
		example: "2026-10-12T09:00:00.000Z",
	}),
	scheduledTimezone: z.string().trim().min(1).nullable().optional().meta({
		example: "Europe/London",
	}),
};

const releaseParams = z.object({
	id: z.string().regex(/^\d+$/).meta({
		description: "The release ID",
		example: "1",
	}),
});
const releaseDocumentParams = releaseParams.extend({
	releaseDocumentId: z.string().regex(/^\d+$/).meta({
		description: "The release document ID",
		example: "1",
	}),
});
const commentParams = releaseParams.extend({
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
		response: z.array(releaseSummaryResponseSchema),
	} satisfies ControllerSchema,
	getOverview: {
		body: undefined,
		query: noQuery,
		params: undefined,
		response: releaseOverviewResponseSchema,
	} satisfies ControllerSchema,
	getSingle: {
		body: undefined,
		query: noQuery,
		params: releaseParams,
		response: releaseResponseSchema,
	} satisfies ControllerSchema,
	getReviewers: {
		body: undefined,
		query: noQuery,
		params: releaseParams,
		response: z.array(releaseUserSchema),
	} satisfies ControllerSchema,
	getMentionableUsers: {
		body: undefined,
		query: noQuery,
		params: releaseParams,
		response: z.array(releaseUserSchema),
	} satisfies ControllerSchema,
	getExecution: {
		body: undefined,
		query: noQuery,
		params: releaseParams,
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
			documents: z.array(releaseDocumentInputSchema).min(1),
			reviewerIds: z.array(z.number().int().positive()).optional(),
		}),
		query: noQuery,
		params: undefined,
		response: z.object({
			id: z.number().meta({
				description: "The new release's ID",
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
		params: releaseParams,
		response: undefined,
	} satisfies ControllerSchema,
	addDocuments: {
		body: z.object({
			documents: z.array(releaseDocumentInputSchema).min(1),
		}),
		query: noQuery,
		params: releaseParams,
		response: undefined,
	} satisfies ControllerSchema,
	removeDocument: {
		body: undefined,
		query: noQuery,
		params: releaseDocumentParams,
		response: undefined,
	} satisfies ControllerSchema,
	updateTargets: {
		body: z.object({ targets: releaseDocumentInputSchema.shape.targets }),
		query: noQuery,
		params: releaseDocumentParams,
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
		params: releaseDocumentParams,
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
		params: releaseParams,
		response: undefined,
	} satisfies ControllerSchema,
	publish: {
		body: undefined,
		query: noQuery,
		params: releaseParams,
		response: z.object({ jobId: z.string() }),
	} satisfies ControllerSchema,
	unapprove: {
		body: undefined,
		query: noQuery,
		params: releaseParams,
		response: undefined,
	} satisfies ControllerSchema,
	close: {
		body: undefined,
		query: noQuery,
		params: releaseParams,
		response: undefined,
	} satisfies ControllerSchema,
	reopen: {
		body: undefined,
		query: noQuery,
		params: releaseParams,
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
		params: releaseParams,
		response: undefined,
	} satisfies ControllerSchema,
	updateComment: {
		body: z.object({ body: richTextJSONSchema }),
		query: noQuery,
		params: commentParams,
		response: undefined,
	} satisfies ControllerSchema,
	updateCommentResolution: {
		body: z.object({ resolution: releaseCommentResolutionSchema.nullable() }),
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
export type ReleaseDocumentInput = z.infer<typeof releaseDocumentInputSchema>;
