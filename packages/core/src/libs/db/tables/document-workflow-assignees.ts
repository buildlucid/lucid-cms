import type { Generated } from "kysely";
import z from "zod";
import { defineTable } from "../client/table/definition.js";
import type { TimestampImmutable } from "../types.js";

export const documentWorkflowAssigneesTable = defineTable(
	"lucid_document_workflow_assignees",
	() => ({
		columns: {
			id: {
				schema: z.number(),
				type: "primary",
			},
			workflow_id: {
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

export interface LucidDocumentWorkflowAssignees {
	id: Generated<number>;
	workflow_id: number;
	user_id: number;
	assigned_by: number | null;
	assigned_at: TimestampImmutable;
}
