import type { Generated, JSONColumnType } from "kysely";
import z from "zod";
import { defineTable } from "../client/table/definition.js";
import type { TimestampImmutable } from "../types.js";

export const documentPublishOperationEventTypes = [
	"created",
	"superseded",
	"approved",
	"rejected",
	"cancelled",
	"scheduled",
	"executing",
	"executed",
	"failed",
	"rescheduled",
	"retried",
	"reviewers_updated",
] as const satisfies readonly [
	DocumentPublishOperationEventType,
	...DocumentPublishOperationEventType[],
];

export const documentPublishOperationEventsTable = defineTable(
	"lucid_document_publish_operation_events",
	() => ({
		columns: {
			id: {
				schema: z.number(),
				type: "primary",
			},
			operation_id: {
				schema: z.number(),
				type: "integer",
			},
			event_type: {
				schema: z.enum(documentPublishOperationEventTypes),
				type: "text",
			},
			user_id: {
				schema: z.number().nullable(),
				type: "integer",
			},
			comment: {
				schema: z.string().nullable(),
				type: "text",
			},
			metadata: {
				schema: z.record(z.string(), z.unknown()),
				type: "json",
			},
			created_at: {
				schema: z.union([z.string(), z.date()]),
				type: "timestamp",
			},
		},
	}),
);

export type DocumentPublishOperationEventType =
	| "created"
	| "superseded"
	| "approved"
	| "rejected"
	| "cancelled"
	| "scheduled"
	| "executing"
	| "executed"
	| "failed"
	| "rescheduled"
	| "retried"
	| "reviewers_updated";

export interface LucidDocumentPublishOperationEvents {
	id: Generated<number>;
	operation_id: number;
	event_type: DocumentPublishOperationEventType;
	user_id: number | null;
	comment: string | null;
	metadata: JSONColumnType<
		Record<string, unknown>,
		Record<string, unknown>,
		Record<string, unknown>
	>;
	created_at: TimestampImmutable;
}
