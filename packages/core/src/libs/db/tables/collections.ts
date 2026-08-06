import type { ColumnType } from "kysely";
import z from "zod";
import { defineTable } from "../client/table/definition.js";
import type {
	BooleanInt,
	TimestampImmutable,
	TimestampMutable,
} from "../types.js";

export const collectionsTable = defineTable("lucid_collections", (adapter) => ({
	columns: {
		key: {
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
	},
	query: {
		filters: {
			isDeleted: "is_deleted",
			key: "key",
		},
		sorts: {
			key: "key",
			isDeleted: "is_deleted",
			isDeletedAt: "is_deleted_at",
			createdAt: "created_at",
		},
		operators: {
			key: "contains",
		},
	} as const,
}));

export interface LucidCollections {
	key: string;
	is_deleted: ColumnType<BooleanInt, BooleanInt | undefined, BooleanInt>;
	is_deleted_at: TimestampMutable;
	created_at: TimestampImmutable;
}
