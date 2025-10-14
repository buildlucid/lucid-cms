import z from "zod/v4";
import StaticRepository from "./parents/static-repository.js";
import type { KyselyDB } from "../db-adapter/types.js";
import type DatabaseAdapter from "../db-adapter/adapter-base.js";

export default class LocalesRepository extends StaticRepository<"lucid_locales"> {
	constructor(db: KyselyDB, dbAdapter: DatabaseAdapter) {
		super(db, dbAdapter, "lucid_locales");
	}
	tableSchema = z.object({
		code: z.string(),
		is_deleted: z.union([
			z.literal(this.dbAdapter.config.defaults.boolean.true),
			z.literal(this.dbAdapter.config.defaults.boolean.false),
		]),
		is_deleted_at: z.union([z.string(), z.date()]).nullable(),
		created_at: z.union([z.string(), z.date()]).nullable(),
		updated_at: z.union([z.string(), z.date()]).nullable(),
	});
	columnFormats = {
		code: this.dbAdapter.getDataType("text"),
		is_deleted: this.dbAdapter.getDataType("boolean"),
		is_deleted_at: this.dbAdapter.getDataType("timestamp"),
		created_at: this.dbAdapter.getDataType("timestamp"),
		updated_at: this.dbAdapter.getDataType("timestamp"),
	};
	queryConfig = {
		tableKeys: {
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
		},
		operators: {
			code: this.dbAdapter.config.fuzzOperator,
		},
	} as const;
}
