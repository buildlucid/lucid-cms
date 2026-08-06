import type { Generated } from "kysely";
import z from "zod";
import type { PreviewMode } from "../../../types/response.js";
import { defineTable } from "../client/table/definition.js";
import type { TimestampImmutable } from "../types.js";
import type { DocumentVersionType } from "./document-versions.js";

export const previewSessionsTable = defineTable(
	"lucid_preview_sessions",
	() => ({
		columns: {
			id: {
				schema: z.number(),
				type: "primary",
			},
			token_hash: {
				schema: z.string(),
				type: "char",
				args: [64],
			},
			entry_collection_key: {
				schema: z.string(),
				type: "text",
			},
			entry_document_id: {
				schema: z.number(),
				type: "integer",
			},
			entry_version_type: {
				schema: z.string(),
				type: "varchar",
				args: [255],
			},
			mode: {
				schema: z.enum(["perspective", "scoped"]),
				type: "varchar",
				args: [255],
			},
			entry_version_id: {
				schema: z.number().nullable(),
				type: "integer",
			},
			expires_at: {
				schema: z.union([z.string(), z.date()]),
				type: "timestamp",
			},
			created_by: {
				schema: z.number().nullable(),
				type: "integer",
			},
			created_at: {
				schema: z.union([z.string(), z.date()]),
				type: "timestamp",
			},
		},
	}),
);

export interface LucidPreviewSessions {
	id: Generated<number>;
	token_hash: string;
	entry_collection_key: string;
	entry_document_id: number;
	entry_version_type: DocumentVersionType;
	mode: PreviewMode;
	entry_version_id: number | null;
	expires_at: TimestampImmutable;
	created_by: number | null;
	created_at: TimestampImmutable;
}
