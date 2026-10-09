import z from "zod";
import { requestCommentResolutionSchema } from "../../../../libs/db/tables/request-events.js";
import {
	requestStatusSchema,
	requestTypeSchema,
} from "../../../../libs/db/tables/requests.js";
import {
	requestIdInput,
	requestLinksSchema,
	requestUserSchema,
} from "../schema.js";

export const inputSchema = z.object({
	requestId: requestIdInput,
	include: z
		.array(z.enum(["activity"]))
		.default([])
		.meta({
			description:
				"activity adds approvals, target changes, document changes and other events besides comments.",
		}),
});

const commentShape = {
	id: z.number(),
	author: requestUserSchema.nullable(),
	agent: z.string().nullable().meta({
		description: "The agent that wrote it for the author, if any.",
	}),
	byYou: z.boolean().meta({
		description:
			"Written by you, so you can change, resolve or remove it with requests_update_comment.",
	}),
	body: z.string().meta({ description: "HTML." }),
	createdAt: z.string().nullable(),
};

export const outputSchema = z.object({
	data: z.object({
		id: z.number(),
		type: requestTypeSchema,
		title: z.string(),
		description: z.string().nullable().meta({ description: "HTML." }),
		status: requestStatusSchema,
		approved: z.boolean(),
		approvals: z.object({
			given: z.array(requestUserSchema.nullable()),
			required: z.number(),
		}),
		createdBy: requestUserSchema.nullable(),
		reviewers: z.array(requestUserSchema),
		scheduledAt: z.string().nullable(),
		failure: z
			.string()
			.nullable()
			.meta({ description: "Why the last completion attempt failed." }),
		completedAt: z.string().nullable(),
		documents: z.array(
			z.object({
				collectionKey: z.string(),
				documentId: z.number(),
				label: z.string().nullable(),
				source: z.string().nullable().meta({
					description:
						"latest when the request holds a proposal: read it with documents_get and version request:ID, and compare it with the target versions. An environment when it holds a snapshot of that environment. Null for unpublish and delete requests.",
				}),
				deleted: z.enum(["bin", "permanent"]).nullable(),
				workflowStage: z.string().nullable(),
				targets: z.array(
					z.object({
						target: z.string(),
						changes: z.boolean().meta({
							description: "Whether completing changes what it holds.",
						}),
						changedByOthers: z.boolean().meta({
							description:
								"Someone else published to it since the request was opened. It needs acknowledging before approval.",
						}),
						acknowledged: z.boolean(),
					}),
				),
			}),
		),
		blockers: z
			.array(
				z.object({
					code: z.string(),
					collectionKey: z.string().nullable(),
					documentId: z.number().nullable(),
					target: z.string().nullable(),
					message: z.string().nullable(),
				}),
			)
			.meta({
				description:
					"What stops approval or completion, eg. review_required for targets to acknowledge, workflow for stages, or check for a collection's own checks with a message.",
			}),
		comments: z
			.array(
				z.object({
					...commentShape,
					resolution: requestCommentResolutionSchema.nullable().meta({
						description:
							"Null while open. Open comments block approval until resolved or closed.",
					}),
					replies: z.array(z.object(commentShape)),
				}),
			)
			.meta({ description: "Comment threads, oldest first." }),
		activity: z
			.array(
				z
					.looseObject({
						type: z.string(),
						user: requestUserSchema.nullable(),
						createdAt: z.string().nullable(),
					})
					.meta({ description: "Other details depend on the type." }),
			)
			.optional(),
		permissions: z
			.object({
				edit: z.boolean().meta({
					description:
						"Change details, documents and targets, close it, or acknowledge changes.",
				}),
				complete: z
					.boolean()
					.meta({ description: "Complete or schedule it once approved." }),
				reopen: z.boolean(),
			})
			.optional()
			.meta({ description: "What the person you act for can do." }),
		reviewToken: z.string().optional().meta({
			description:
				"Pass to requests_acknowledge to acknowledge changes as you read them.",
		}),
		links: requestLinksSchema,
	}),
});
