import type { Generated, JSONColumnType } from "kysely";
import z from "zod";
import type { MigrationPlan } from "../../collection/migration/types.js";
import type { CollectionSchema } from "../../collection/schema/types.js";
import { defineTable } from "../client/table/definition.js";
import type { TimestampImmutable } from "../types.js";

export const collectionMigrationsTable = defineTable(
	"lucid_collection_migrations",
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
			table_name_map: {
				schema: z.string(),
				type: "text",
			},
			migration_plans: {
				schema: z.unknown(),
				type: "json",
			},
			collection_schema: {
				schema: z.unknown(),
				type: "json",
			},
			created_at: {
				schema: z.union([z.string(), z.date()]).nullable(),
				type: "timestamp",
			},
		},
	}),
);

export interface LucidCollectionMigrations {
	id: Generated<number>;
	collection_key: string;
	table_name_map: string;
	migration_plans: JSONColumnType<MigrationPlan, MigrationPlan, MigrationPlan>;
	collection_schema: JSONColumnType<
		CollectionSchema,
		CollectionSchema,
		CollectionSchema
	>;
	created_at: TimestampImmutable;
}
