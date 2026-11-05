import type { Generated, JSONColumnType } from "kysely";
import z from "zod";
import {
	type BrickInputSchema,
	brickInputSchema,
} from "../../../schemas/collection-bricks.js";
import {
	type FieldInputSchema,
	fieldInputSchema,
} from "../../../schemas/collection-fields.js";
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
				schema: z.enum(["navigable", "scoped"]),
				type: "varchar",
				args: [255],
			},
			entry_version_id: {
				schema: z.number().nullable(),
				type: "integer",
			},
			draft_version_id: {
				schema: z.number().nullable(),
				type: "integer",
			},
			draft_content_id: {
				schema: z.string().nullable(),
				type: "text",
			},
			draft_content: {
				schema: z
					.object({
						bricks: z.array(brickInputSchema),
						fields: z.array(fieldInputSchema),
					})
					.nullable(),
				type: "json",
			},
			draft_revision: {
				schema: z.number(),
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
	/** The version the unsaved draft was edited from. Reads of other versions ignore the draft. */
	draft_version_id: number | null;
	/** The saved content the draft was edited from. Once the version is saved again, reads ignore the draft. */
	draft_content_id: string | null;
	/** Unsaved editor content shown in place of the stored version, only through this session's token. */
	draft_content: JSONColumnType<
		LucidPreviewDraftContent | null,
		LucidPreviewDraftContent | null | undefined,
		LucidPreviewDraftContent | null
	>;
	/** Rises with every draft write so late, older writes are ignored. */
	draft_revision: Generated<number>;
	expires_at: TimestampImmutable;
	created_by: number | null;
	created_at: TimestampImmutable;
}

export type LucidPreviewDraftContent = {
	bricks: BrickInputSchema[];
	fields: FieldInputSchema[];
};
