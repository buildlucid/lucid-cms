import type { RichTextJSON } from "@lucidcms/rich-text";
import type { Generated, JSONColumnType } from "kysely";
import z from "zod";
import { richTextJSONSchema } from "../../../schemas/shared/rich-text.js";
import { defineTable } from "../client/table/definition.js";
import type { TimestampImmutable, TimestampMutable } from "../types.js";

const releaseEventTypeSchema = z.enum([
	"comment",
	"approved",
	"approval_dismissed",
	"schedule_updated",
	"released",
	"failed",
	"closed",
	"reopened",
	"target_published",
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

/** Every comment needs one of these before a release can be approved. */
export const releaseCommentResolutionSchema = z.enum(["resolved", "closed"]);

/** Event details that are not part of the comment body. */
const releaseEventMetadataSchema = z.object({
	releaseDocumentId: z.number().optional(),
	collectionKey: z.string().optional(),
	documentId: z.number().optional(),
	scheduledAt: z.string().nullable().optional(),
	scheduledTimezone: z.string().nullable().optional(),
	message: z.string().optional(),
	/** Publication attempt used to reconcile failure diagnostics without duplicate activity. */
	jobId: z.string().optional(),
	/** The environment a target event is about. */
	target: z.string().optional(),
	/** The release that published, for target_published. Null for a direct publish. */
	sourceReleaseId: z.number().nullable().optional(),
	/** The new workflow stage, for workflow_updated. */
	stage: z.string().optional(),
	/** The reviewer, for reviewer_added and reviewer_removed. */
	userId: z.number().optional(),
});

export const releaseEventsTable = defineTable("lucid_release_events", () => ({
	columns: {
		id: {
			schema: z.number(),
			type: "primary",
		},
		release_id: {
			schema: z.number(),
			type: "integer",
		},
		user_id: {
			schema: z.number().nullable(),
			type: "integer",
		},
		parent_id: {
			schema: z.number().nullable(),
			type: "integer",
		},
		type: {
			schema: releaseEventTypeSchema,
			type: "text",
		},
		body: {
			schema: richTextJSONSchema.nullable(),
			type: "json",
		},
		metadata: {
			schema: releaseEventMetadataSchema.nullable(),
			type: "json",
		},
		resolution: {
			schema: releaseCommentResolutionSchema.nullable(),
			type: "text",
		},
		resolved_by: {
			schema: z.number().nullable(),
			type: "integer",
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

export type ReleaseEventType = z.infer<typeof releaseEventTypeSchema>;
export type ReleaseEventMetadata = z.infer<typeof releaseEventMetadataSchema>;
export type ReleaseCommentResolution = z.infer<
	typeof releaseCommentResolutionSchema
>;

type ReleaseTargetEventMetadata = { releaseDocumentId: number; target: string };

/** The metadata each event type stores. Null means the event has none. */
export type ReleaseEventMetadataByType = {
	comment: null;
	approved: null;
	approval_dismissed: null;
	released: null;
	closed: null;
	reopened: null;
	schedule_updated: {
		scheduledAt: string | null;
		scheduledTimezone: string | null;
	};
	failed: {
		message: string;
		jobId?: string;
		releaseDocumentId?: number;
		target?: string;
	};
	target_published: ReleaseTargetEventMetadata & {
		sourceReleaseId: number | null;
	};
	target_reviewed: ReleaseTargetEventMetadata;
	target_unreviewed: ReleaseTargetEventMetadata;
	target_added: ReleaseTargetEventMetadata;
	target_removed: ReleaseTargetEventMetadata;
	workflow_updated: { releaseDocumentId: number; stage: string };
	proposal_edited: { releaseDocumentId: number };
	document_added: { collectionKey: string; documentId: number };
	document_removed: { collectionKey: string; documentId: number };
	reviewer_added: { userId: number };
	reviewer_removed: { userId: number };
};

/** A new activity entry, with its metadata checked against its type. Only comments have replies. */
export type ReleaseEventInsert = {
	[Type in ReleaseEventType]: {
		release_id: number;
		user_id: number | null;
		type: Type;
		body?: RichTextJSON | null;
		parent_id?: Type extends "comment" ? number | null : never;
	} & (ReleaseEventMetadataByType[Type] extends null
		? { metadata?: never }
		: { metadata: ReleaseEventMetadataByType[Type] });
}[ReleaseEventType];

export interface LucidReleaseEvents {
	id: Generated<number>;
	release_id: number;
	user_id: number | null;
	/** The comment a reply belongs to. Null for top-level comments and other activity. */
	parent_id: number | null;
	type: ReleaseEventType;
	body: JSONColumnType<
		RichTextJSON | null,
		RichTextJSON | null,
		RichTextJSON | null
	>;
	metadata: JSONColumnType<
		ReleaseEventMetadata | null,
		ReleaseEventMetadata | null,
		ReleaseEventMetadata | null
	>;
	/** How a comment was dealt with. Null while it is still open. */
	resolution: ReleaseCommentResolution | null;
	resolved_by: number | null;
	resolved_at: TimestampMutable;
	created_at: TimestampImmutable;
	updated_at: TimestampMutable;
}
