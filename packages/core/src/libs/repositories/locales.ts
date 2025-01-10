import z from "zod";
import BaseRepository from "./base-repository.js";
import type { KyselyDB } from "../db/types.js";
import type DatabaseAdapter from "../db/adapter.js";

export default class LocalesRepository extends BaseRepository<"lucid_locales"> {
	constructor(db: KyselyDB, dbAdapter: DatabaseAdapter) {
		super(db, dbAdapter, "lucid_locales");
	}
	tableSchema = z.object({
		code: z.string(),
		is_deleted: z.union([
			z.literal(this.dbAdapter.config.defaults.boolean.true),
			z.literal(this.dbAdapter.config.defaults.boolean.false),
		]),
		is_deleted_at: z.string().nullable(),
		created_at: z.string().nullable(),
		updated_at: z.string().nullable(),
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
