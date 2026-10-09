import type { Generated } from "kysely";
import z from "zod";
import { versionTypesSchema } from "../../../schemas/document-versions.js";
import { defineTable } from "../client/table/definition.js";
import type { TimestampImmutable, TimestampMutable } from "../types.js";
import { isDocumentTableName } from "./document-table-name.js";

export const documentVersionsTable = defineTable(
	"lucid_document__collection-key__ver",
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
			collection_migration_id: {
				schema: z.number(),
				type: "integer",
			},
			document_id: {
				schema: z.number(),
				type: "integer",
			},
			type: {
				schema: versionTypesSchema,
				type: "text",
			},
			promoted_from: {
				schema: z.number().nullable(),
				type: "integer",
			},
			content_id: {
				schema: z.string(),
				type: "text",
			},
			created_by: {
				schema: z.number().nullable(),
				type: "integer",
			},
			created_by_run_id: {
				schema: z.string().nullable(),
				type: "text",
			},
			updated_by: {
				schema: z.number().nullable(),
				type: "integer",
			},
			updated_by_run_id: {
				schema: z.string().nullable(),
				type: "text",
			},
			updated_at: {
				schema: z.union([z.string(), z.date()]).nullable(),
				type: "timestamp",
			},
			created_at: {
				schema: z.union([z.string(), z.date()]).nullable(),
				type: "timestamp",
			},
		},
	}),
	{
		priority: 300,
		matches: (tableName) =>
			isDocumentTableName(tableName) && tableName.endsWith("__ver"),
	},
);

export type DocumentVersionType = "latest" | "revision" | string;

export type LucidVersionTableName = `lucid_document__${string}__ver`;

export interface LucidVersionTable {
	id: Generated<number>;
	collection_key: string;
	collection_migration_id: number;
	document_id: number;
	type: DocumentVersionType;
	promoted_from: number | null;
	content_id: string;
	created_by: number | null;
	/** The agent run that created it, acting for `created_by` or the system. */
	created_by_run_id: string | null;
	updated_by: number | null;
	/** The agent run behind the last update, acting for `updated_by` or the system. */
	updated_by_run_id: string | null;
	created_at: TimestampImmutable;
	updated_at: TimestampMutable;
}
