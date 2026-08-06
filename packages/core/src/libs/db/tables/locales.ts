import type { ColumnType } from "kysely";
import z from "zod";
import { defineTable } from "../client/table/definition.js";
import type {
	BooleanInt,
	TimestampImmutable,
	TimestampMutable,
} from "../types.js";

export const localesTable = defineTable("lucid_locales", (adapter) => ({
	columns: {
		code: {
			schema: z.string(),
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
			schema: z.union([z.string(), z.date()]).nullable(),
			type: "timestamp",
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
	query: {
		filters: {
			code: "code",
			isDeleted: "is_deleted",
		},
		sorts: {
			code: "code",
			isDeleted: "is_deleted",
			isDeletedAt: "is_deleted_at",
			createdAt: "created_at",
			updatedAt: "updated_at",
		},
		operators: {
			code: "contains",
		},
	} as const,
}));

export interface LucidLocales {
	code: string;
	created_at: TimestampImmutable;
	updated_at: TimestampMutable;
	is_deleted: ColumnType<BooleanInt, BooleanInt | undefined, BooleanInt>;
	is_deleted_at: TimestampMutable;
}
