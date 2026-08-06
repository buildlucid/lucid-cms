import type { RichTextJSON } from "@lucidcms/rich-text";
import type { Generated, JSONColumnType } from "kysely";
import z from "zod";
import { richTextJSONSchema } from "../../../schemas/shared/rich-text.js";
import { defineTable } from "../client/table/definition.js";
import type { TimestampImmutable, TimestampMutable } from "../types.js";

export const documentPublishOperationsTable = defineTable(
	"lucid_document_publish_operations",
	() => ({
		columns: {
			id: {
				schema: z.number(),
				type: "primary",
			},
			collection_key: {
				schema: z.string(),
				type: "text",
			},
			document_id: {
				schema: z.number(),
				type: "integer",
			},
			target: {
				schema: z.string(),
				type: "text",
			},
			operation_type: {
				schema: z.enum(["request", "direct"]),
				type: "text",
			},
			status: {
				schema: z.enum([
					"pending",
					"approved",
					"rejected",
					"cancelled",
					"superseded",
				]),
				type: "text",
			},
			source_version_id: {
				schema: z.number(),
				type: "integer",
			},
			source_content_id: {
				schema: z.string(),
				type: "text",
			},
			snapshot_version_id: {
				schema: z.number(),
				type: "integer",
			},
			requested_by: {
				schema: z.number().nullable(),
				type: "integer",
			},
			request_comment: {
				schema: richTextJSONSchema.nullable(),
				type: "json",
			},
			decided_by: {
				schema: z.number().nullable(),
				type: "integer",
			},
			decision_comment: {
				schema: richTextJSONSchema.nullable(),
				type: "json",
			},
			decided_at: {
				schema: z.union([z.string(), z.date()]).nullable(),
				type: "timestamp",
			},
			scheduled_at: {
				schema: z.union([z.string(), z.date()]).nullable(),
				type: "timestamp",
			},
			scheduled_timezone: {
				schema: z.string().nullable(),
				type: "text",
			},
			execution_status: {
				schema: z.enum([
					"awaiting_approval",
					"scheduled",
					"executing",
					"executed",
					"failed",
					"cancelled",
				]),
				type: "text",
			},
			executed_at: {
				schema: z.union([z.string(), z.date()]).nullable(),
				type: "timestamp",
			},
			failed_at: {
				schema: z.union([z.string(), z.date()]).nullable(),
				type: "timestamp",
			},
			execution_error_message: {
				schema: z.string().nullable(),
				type: "text",
			},
			execution_error_data: {
				schema: z.record(z.string(), z.unknown()).nullable(),
				type: "json",
			},
			scheduled_job_id: {
				schema: z.string().nullable(),
				type: "text",
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
			requested_by_profile_picture: {},
			decided_by_profile_picture: {},
			assignees: {},
			profile_picture: {},
			events: {},
			crop: {},
			translations: {},
			metadata: {},
		},
		query: {
			filters: {
				status: "lucid_document_publish_operations.status",
				executionStatus: "lucid_document_publish_operations.execution_status",
				operationType: "lucid_document_publish_operations.operation_type",
				collectionKey: "lucid_document_publish_operations.collection_key",
				documentId: "lucid_document_publish_operations.document_id",
				target: "lucid_document_publish_operations.target",
				requestedBy: "lucid_document_publish_operations.requested_by",
				createdAt: "lucid_document_publish_operations.created_at",
				updatedAt: "lucid_document_publish_operations.updated_at",
				scheduledAt: "lucid_document_publish_operations.scheduled_at",
				executedAt: "lucid_document_publish_operations.executed_at",
				failedAt: "lucid_document_publish_operations.failed_at",
			},
			sorts: {
				createdAt: "lucid_document_publish_operations.created_at",
				updatedAt: "lucid_document_publish_operations.updated_at",
				scheduledAt: "lucid_document_publish_operations.scheduled_at",
				executedAt: "lucid_document_publish_operations.executed_at",
				failedAt: "lucid_document_publish_operations.failed_at",
			},
		} as const,
	}),
);

export type DocumentPublishOperationStatus =
	| "pending"
	| "approved"
	| "rejected"
	| "cancelled"
	| "superseded";

export type DocumentPublishOperationExecutionStatus =
	| "awaiting_approval"
	| "scheduled"
	| "executing"
	| "executed"
	| "failed"
	| "cancelled";

export type DocumentPublishOperationType = "request" | "direct";

export interface LucidDocumentPublishOperations {
	id: Generated<number>;
	collection_key: string;
	document_id: number;
	target: string;
	operation_type: DocumentPublishOperationType;
	status: DocumentPublishOperationStatus;
	source_version_id: number;
	source_content_id: string;
	snapshot_version_id: number;
	requested_by: number | null;
	request_comment: JSONColumnType<
		RichTextJSON | null,
		RichTextJSON | null,
		RichTextJSON | null
	>;
	decided_by: number | null;
	decision_comment: JSONColumnType<
		RichTextJSON | null,
		RichTextJSON | null,
		RichTextJSON | null
	>;
	decided_at: TimestampMutable;
	scheduled_at: TimestampMutable;
	scheduled_timezone: string | null;
	execution_status: DocumentPublishOperationExecutionStatus;
	executed_at: TimestampMutable;
	failed_at: TimestampMutable;
	execution_error_message: string | null;
	execution_error_data: JSONColumnType<
		Record<string, unknown> | null,
		Record<string, unknown> | null,
		Record<string, unknown> | null
	>;
	scheduled_job_id: string | null;
	created_at: TimestampImmutable;
	updated_at: TimestampMutable;
}
