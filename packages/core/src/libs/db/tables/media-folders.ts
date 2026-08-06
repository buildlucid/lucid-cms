import type { Generated } from "kysely";
import z from "zod";
import { defineTable } from "../client/table/definition.js";
import type { TimestampImmutable, TimestampMutable } from "../types.js";

export const mediaFoldersTable = defineTable("lucid_media_folders", () => ({
	columns: {
		id: {
			schema: z.number(),
			type: "primary",
		},
		title: {
			schema: z.string(),
			type: "text",
		},
		parent_folder_id: {
			schema: z.number().nullable(),
			type: "integer",
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
			schema: z.union([z.string(), z.date()]).nullable(),
			type: "timestamp",
		},
		updated_at: {
			schema: z.union([z.string(), z.date()]).nullable(),
			type: "timestamp",
		},
	},
	results: {
		folder_count: {
			schema: z.number().nullable().optional(),
		},
		media_count: {
			schema: z.number().nullable().optional(),
		},
	},
	query: {
		filters: {
			title: "title",
			parentFolderId: "parent_folder_id",
			createdBy: "created_by",
		},
		sorts: {
			title: "title",
			createdAt: "created_at",
			updatedAt: "updated_at",
		},
	} as const,
}));

export interface LucidMediaFolders {
	id: Generated<number>;
	title: string;
	parent_folder_id: number | null;
	created_by: number | null;
	updated_by: number | null;
	created_at: TimestampImmutable;
	updated_at: TimestampMutable;
}
