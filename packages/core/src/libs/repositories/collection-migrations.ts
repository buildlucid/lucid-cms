import z from "zod/v4";
import type DatabaseAdapter from "../db-adapter/adapter-base.js";
import type { KyselyDB } from "../db-adapter/types.js";
import StaticRepository from "./parents/static-repository.js";

export default class CollectionMigrationsRepository extends StaticRepository<"lucid_collection_migrations"> {
	constructor(db: KyselyDB, dbAdapter: DatabaseAdapter) {
		super(db, dbAdapter, "lucid_collection_migrations");
	}
	tableSchema = z.object({
		id: z.number(),
		collection_key: z.string(),
		migration_plans: z.unknown(),
		created_at: z.union([z.string(), z.date()]).nullable(),
	});
	columnFormats = {
		id: this.dbAdapter.getDataType("primary"),
		collection_key: this.dbAdapter.getDataType("text"),
		migration_plans: this.dbAdapter.getDataType("json"),
		created_at: this.dbAdapter.getDataType("timestamp"),
	};
	queryConfig = undefined;
}
