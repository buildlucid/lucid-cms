import type { Generated } from "kysely";
import z from "zod";
import { defineTable } from "../client/table/definition.js";
import type { TimestampImmutable } from "../types.js";

export const documentPublishOperationAssigneesTable = defineTable(
	"lucid_document_publish_operation_assignees",
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
			user_id: {
				schema: z.number(),
				type: "integer",
			},
			assigned_by: {
				schema: z.number().nullable(),
				type: "integer",
			},
			assigned_at: {
				schema: z.union([z.string(), z.date()]),
				type: "timestamp",
			},
		},
	}),
);

export interface LucidDocumentPublishOperationAssignees {
	id: Generated<number>;
	operation_id: number;
	user_id: number;
	assigned_by: number | null;
	assigned_at: TimestampImmutable;
}
