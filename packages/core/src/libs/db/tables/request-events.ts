import type { RichTextJSON } from "@lucidcms/rich-text";
import type { Generated, JSONColumnType } from "kysely";
import z from "zod";
import { richTextJSONSchema } from "../../../schemas/shared/rich-text.js";
import { defineTable } from "../client/table/definition.js";
import type { TimestampImmutable, TimestampMutable } from "../types.js";

const requestEventTypeSchema = z.enum([
	"comment",
	"approved",
	"approval_dismissed",
	"schedule_updated",
	"completed",
	"failed",
	"closed",
	"reopened",
	"target_published",
	"target_unpublished",
	"target_reviewed",
	"target_unreviewed",
	"document_added",
	"document_removed",
	"reviewer_added",
	"reviewer_removed",
	"target_added",
	"target_removed",
	"workflow_updated",
	"proposal_edited",
]);

/** Every comment needs one of these before a request can be approved. */
export const requestCommentResolutionSchema = z.enum(["resolved", "closed"]);

/** Event details that are not part of the comment body. */
const requestEventMetadataSchema = z.object({
	requestDocumentId: z.number().optional(),
	collectionKey: z.string().optional(),
	documentId: z.number().optional(),
	scheduledAt: z.string().nullable().optional(),
	scheduledTimezone: z.string().nullable().optional(),
	message: z.string().optional(),
	/** Request attempt used to reconcile failure diagnostics without duplicate activity. */
	jobId: z.string().optional(),
	/** The environment a target event is about. */
	target: z.string().optional(),
	/** The request that made the change, for target_published and target_unpublished. Null for a direct change. */
	sourceRequestId: z.number().nullable().optional(),
	/** The new workflow stage, for workflow_updated. */
	stage: z.string().optional(),
	/** The reviewer, for reviewer_added and reviewer_removed. */
	userId: z.number().optional(),
});

export const requestEventsTable = defineTable("lucid_request_events", () => ({
	columns: {
		id: {
			schema: z.number(),
			type: "primary",
		},
		request_id: {
			schema: z.number(),
			type: "integer",
		},
		user_id: {
			schema: z.number().nullable(),
			type: "integer",
		},
		agent_run_id: {
			schema: z.string().nullable(),
			type: "text",
		},
		parent_id: {
			schema: z.number().nullable(),
			type: "integer",
		},
		type: {
			schema: requestEventTypeSchema,
			type: "text",
		},
		body: {
			schema: richTextJSONSchema.nullable(),
			type: "json",
		},
		metadata: {
			schema: requestEventMetadataSchema.nullable(),
			type: "json",
		},
		resolution: {
			schema: requestCommentResolutionSchema.nullable(),
			type: "text",
		},
		resolved_by: {
			schema: z.number().nullable(),
			type: "integer",
		},
		resolved_by_run_id: {
			schema: z.uuid().nullable(),
			type: "text",
		},
		resolved_at: {
			schema: z.union([z.string(), z.date()]).nullable(),
			type: "timestamp",
		},
		created_at: {
			schema: z.union([z.string(), z.date()]),
			type: "timestamp",
		},
		updated_at: {
			schema: z.union([z.string(), z.date()]).nullable(),
			type: "timestamp",
		},
	},
}));

export type RequestEventType = z.infer<typeof requestEventTypeSchema>;
export type RequestEventMetadata = z.infer<typeof requestEventMetadataSchema>;
export type RequestCommentResolution = z.infer<
	typeof requestCommentResolutionSchema
>;

type RequestTargetEventMetadata = { requestDocumentId: number; target: string };

/** The metadata each event type stores. Null means the event has none. */
export type RequestEventMetadataByType = {
	comment: null;
	approved: null;
	approval_dismissed: null;
	completed: null;
	closed: null;
	reopened: null;
	schedule_updated: {
		scheduledAt: string | null;
		scheduledTimezone: string | null;
	};
	failed: {
		message: string;
		jobId?: string;
		requestDocumentId?: number;
		target?: string;
	};
	target_published: RequestTargetEventMetadata & {
		sourceRequestId: number | null;
	};
	target_unpublished: RequestTargetEventMetadata & {
		sourceRequestId: number | null;
	};
	target_reviewed: RequestTargetEventMetadata;
	target_unreviewed: RequestTargetEventMetadata;
	target_added: RequestTargetEventMetadata;
	target_removed: RequestTargetEventMetadata;
	workflow_updated: { requestDocumentId: number; stage: string };
	proposal_edited: { requestDocumentId: number };
	document_added: { collectionKey: string; documentId: number };
	document_removed: { collectionKey: string; documentId: number };
	reviewer_added: { userId: number };
	reviewer_removed: { userId: number };
};

/** A new activity entry, with its metadata checked against its type. Only comments have replies. */
export type RequestEventInsert = {
	[Type in RequestEventType]: {
		request_id: number;
		user_id: number | null;
		agent_run_id?: string | null;
		type: Type;
		body?: RichTextJSON | null;
		parent_id?: Type extends "comment" ? number | null : never;
	} & (RequestEventMetadataByType[Type] extends null
		? { metadata?: never }
		: { metadata: RequestEventMetadataByType[Type] });
}[RequestEventType];

export interface LucidRequestEvents {
	id: Generated<number>;
	request_id: number;
	user_id: number | null;
	/** The agent run that acted, for `user_id` or the system. */
	agent_run_id: string | null;
	/** The comment a reply belongs to. Null for top-level comments and other activity. */
	parent_id: number | null;
	type: RequestEventType;
	body: JSONColumnType<
		RichTextJSON | null,
		RichTextJSON | null,
		RichTextJSON | null
	>;
	metadata: JSONColumnType<
		RequestEventMetadata | null,
		RequestEventMetadata | null,
		RequestEventMetadata | null
	>;
	/** How a comment was dealt with. Null while it is still open. */
	resolution: RequestCommentResolution | null;
	resolved_by: number | null;
	/** The agent run that resolved it, for `resolved_by` or the system. */
	resolved_by_run_id: string | null;
	resolved_at: TimestampMutable;
	created_at: TimestampImmutable;
	updated_at: TimestampMutable;
}
