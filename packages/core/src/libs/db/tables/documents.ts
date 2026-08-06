import type { Generated } from "kysely";
import z from "zod";
import { versionTypesSchema } from "../../../schemas/document-versions.js";
import { defineTable } from "../client/table/definition.js";
import type {
	BooleanInt,
	TimestampImmutable,
	TimestampMutable,
} from "../types.js";

export const documentsTable = defineTable(
	"lucid_document__collection-key",
	(adapter) => ({
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
			order: {
				schema: z.string().nullable(),
				type: "text",
			},
			is_deleted: {
				schema: z.union([
					z.literal(adapter.config.defaults.boolean.true),
					z.literal(adapter.config.defaults.boolean.false),
				]),
				type: "boolean",
			},
			is_deleted_at: {
				schema: z.union([z.string(), z.date()]).optional(),
				type: "timestamp",
			},
			deleted_by: {
				schema: z.number().nullable(),
				type: "integer",
			},
			created_by: {
				schema: z.number().nullable(),
				type: "integer",
			},
			created_at: {
				schema: z.union([z.string(), z.date()]).nullable(),
				type: "timestamp",
			},
			updated_by: {
				schema: z.number().nullable(),
				type: "integer",
			},
			updated_at: {
				schema: z.union([z.string(), z.date()]).nullable(),
				type: "timestamp",
			},
		},
		results: {
			versions: {
				schema: z.array(
					z.object({
						id: z.number(),
						type: versionTypesSchema,
						created_by: z.number().nullable(),
						created_at: z.union([z.string(), z.date()]),
						updated_by: z.number().nullable(),
						updated_at: z.union([z.string(), z.date()]).nullable(),
					}),
				),
			},
			cb_user_id: {
				schema: z.number().nullable(),
			},
			cb_user_email: {
				schema: z.email().nullable(),
			},
			cb_user_first_name: {
				schema: z.string().nullable(),
			},
			cb_user_last_name: {
				schema: z.string().nullable(),
			},
			cb_user_username: {
				schema: z.string().nullable(),
			},
			cb_user_profile_picture: {
				schema: z.array(z.any()).optional(),
			},
			ub_user_id: {
				schema: z.number().nullable(),
			},
			ub_user_email: {
				schema: z.email().nullable(),
			},
			ub_user_first_name: {
				schema: z.string().nullable(),
			},
			ub_user_last_name: {
				schema: z.string().nullable(),
			},
			ub_user_username: {
				schema: z.string().nullable(),
			},
			ub_user_profile_picture: {
				schema: z.array(z.any()).optional(),
			},
			workflow_assignees: {},
			profile_picture: {},
			crop: {},
			translations: {},
		},
	}),
	{
		priority: 100,
		matches: (tableName) => tableName.startsWith("lucid_document__"),
	},
);

export type LucidDocumentTableName = `lucid_document__${string}`;

export interface LucidDocumentTable {
	id: Generated<number>;
	collection_key: string;
	collection_migration_id: number;
	order: string | null;
	is_deleted: BooleanInt;
	is_deleted_at: TimestampMutable;
	deleted_by: number;
	created_by: number;
	created_at: TimestampImmutable;
	updated_by: number;
	updated_at: TimestampMutable;
}
