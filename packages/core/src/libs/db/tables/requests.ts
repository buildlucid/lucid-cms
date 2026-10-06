import type { RichTextJSON } from "@lucidcms/rich-text";
import type { Generated, JSONColumnType } from "kysely";
import z from "zod";
import { richTextJSONSchema } from "../../../schemas/shared/rich-text.js";
import { defineTable } from "../client/table/definition.js";
import type { TimestampImmutable, TimestampMutable } from "../types.js";

export const requestStatusSchema = z.enum(["open", "completed", "closed"]);
/** Publish requests move existing documents to environments. Create requests request one new document. */
export const requestTypeSchema = z.enum(["publish", "create"]);

export const requestsTable = defineTable("lucid_requests", () => ({
	columns: {
		id: {
			schema: z.number(),
			type: "primary",
		},
		type: {
			schema: requestTypeSchema,
			type: "text",
		},
		title: {
			schema: z.string(),
			type: "text",
		},
		description: {
			schema: richTextJSONSchema.nullable(),
			type: "json",
		},
		status: {
			schema: requestStatusSchema,
			type: "text",
		},
		revision: {
			schema: z.number(),
			type: "integer",
		},
		approved_revision: {
			schema: z.number().nullable(),
			type: "integer",
		},
		scheduled_at: {
			schema: z.union([z.string(), z.date()]).nullable(),
			type: "timestamp",
		},
		scheduled_timezone: {
			schema: z.string().nullable(),
			type: "text",
		},
		scheduled_by: {
			schema: z.number().nullable(),
			type: "integer",
		},
		execution_job_id: {
			schema: z.string().nullable(),
			type: "text",
		},
		failure: {
			schema: z.string().nullable(),
			type: "text",
		},
		failure_request_document_id: {
			schema: z.number().nullable(),
			type: "integer",
		},
		failure_target: {
			schema: z.string().nullable(),
			type: "text",
		},
		completed_at: {
			schema: z.union([z.string(), z.date()]).nullable(),
			type: "timestamp",
		},
		lock_token: {
			schema: z.string().nullable(),
			type: "text",
		},
		created_by: {
			schema: z.number().nullable(),
			type: "integer",
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
	results: {
		documents: {
			schema: z.array(
				z.object({
					id: z.number(),
					collection_key: z.string(),
					document_id: z.number(),
					source: z.string(),
					source_version_id: z.number().nullable(),
					targets: z.array(z.object({ target: z.string() })),
				}),
			),
		},
		reviewers: {
			schema: z.array(z.object({ user_id: z.number() })),
		},
	},
	query: {
		filters: {
			type: "lucid_requests.type",
			title: "lucid_requests.title",
			status: "lucid_requests.status",
			createdBy: "lucid_requests.created_by",
			createdAt: "lucid_requests.created_at",
			updatedAt: "lucid_requests.updated_at",
			scheduledAt: "lucid_requests.scheduled_at",
		},
		sorts: {
			createdAt: "lucid_requests.created_at",
			updatedAt: "lucid_requests.updated_at",
			scheduledAt: "lucid_requests.scheduled_at",
		},
	},
}));

export type RequestStatus = z.infer<typeof requestStatusSchema>;
export type RequestType = z.infer<typeof requestTypeSchema>;

export interface LucidRequests {
	id: Generated<number>;
	type: RequestType;
	title: string;
	description: JSONColumnType<
		RichTextJSON | null,
		RichTextJSON | null,
		RichTextJSON | null
	>;
	status: RequestStatus;
	revision: number;
	/** Set once the current revision has every approval it needs. */
	approved_revision: number | null;
	scheduled_at: TimestampMutable;
	scheduled_timezone: string | null;
	scheduled_by: number | null;
	execution_job_id: string | null;
	failure: string | null;
	failure_request_document_id: number | null;
	failure_target: string | null;
	completed_at: TimestampMutable;
	lock_token: string | null;
	created_by: number | null;
	created_at: TimestampImmutable;
	updated_at: TimestampMutable;
}
