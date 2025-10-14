import z from "zod/v4";
import type DatabaseAdapter from "../db-adapter/adapter-base.js";
import type { KyselyDB } from "../db-adapter/types.js";
import StaticRepository from "./parents/static-repository.js";

export default class CollectionsRepository extends StaticRepository<"lucid_collections"> {
	constructor(db: KyselyDB, dbAdapter: DatabaseAdapter) {
		super(db, dbAdapter, "lucid_collections");
	}
	tableSchema = z.object({
		key: z.string(),
		is_deleted: z.union([
			z.literal(this.dbAdapter.config.defaults.boolean.true),
			z.literal(this.dbAdapter.config.defaults.boolean.false),
		]),
		is_deleted_at: z.union([z.string(), z.date()]).nullable(),
		created_at: z.union([z.string(), z.date()]).nullable(),
	});
	columnFormats = {
		key: this.dbAdapter.getDataType("text"),
		is_deleted: this.dbAdapter.getDataType("boolean"),
		is_deleted_at: this.dbAdapter.getDataType("timestamp"),
		created_at: this.dbAdapter.getDataType("timestamp"),
	};
	queryConfig = {
		tableKeys: {
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
		},
		operators: {
			key: this.dbAdapter.config.fuzzOperator,
		},
	} as const;
}
