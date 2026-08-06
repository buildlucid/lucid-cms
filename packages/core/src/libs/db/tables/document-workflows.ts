import type { Generated } from "kysely";
import z from "zod";
import { defineTable } from "../client/table/definition.js";
import type { TimestampImmutable, TimestampMutable } from "../types.js";

export const documentWorkflowsTable = defineTable(
	"lucid_document_workflows",
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
			stage_key: {
				schema: z.string(),
				type: "text",
			},
			created_by: {
				schema: z.number().nullable(),
				type: "integer",
			},
			updated_by: {
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
			assignees: {},
			profile_picture: {},
			crop: {},
			translations: {},
		},
	}),
);

export interface LucidDocumentWorkflows {
	id: Generated<number>;
	collection_key: string;
	document_id: number;
	stage_key: string;
	created_by: number | null;
	updated_by: number | null;
	created_at: TimestampImmutable;
	updated_at: TimestampMutable;
}
