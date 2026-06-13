import z from "zod";
import type DatabaseAdapter from "../db/adapter-base.js";
import type { KyselyDB } from "../db/types.js";
import StaticRepository from "./parents/static-repository.js";

export default class TenantsRepository extends StaticRepository<"lucid_tenants"> {
	constructor(db: KyselyDB, dbAdapter: DatabaseAdapter) {
		super(db, dbAdapter, "lucid_tenants");
	}
	tableSchema = z.object({
		key: z.string(),
		is_deleted: z.union([
			z.literal(this.dbAdapter.config.defaults.boolean.true),
			z.literal(this.dbAdapter.config.defaults.boolean.false),
		]),
		is_deleted_at: z.union([z.string(), z.date()]).nullable(),
		created_at: z.union([z.string(), z.date()]).nullable(),
		updated_at: z.union([z.string(), z.date()]).nullable(),
	});
	columnFormats = {
		key: this.dbAdapter.getDataType("text"),
		is_deleted: this.dbAdapter.getDataType("boolean"),
		is_deleted_at: this.dbAdapter.getDataType("timestamp"),
		created_at: this.dbAdapter.getDataType("timestamp"),
		updated_at: this.dbAdapter.getDataType("timestamp"),
	};
	queryConfig = {
		tableKeys: {
			filters: {
				key: "key",
				isDeleted: "is_deleted",
			},
			sorts: {
				key: "key",
				isDeleted: "is_deleted",
				isDeletedAt: "is_deleted_at",
				createdAt: "created_at",
				updatedAt: "updated_at",
			},
		},
		operators: {
			key: this.dbAdapter.config.fuzzOperator,
		},
	} as const;
}
