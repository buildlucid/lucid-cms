import z from "zod";
import BaseRepository from "./base-repository.js";
import type { KyselyDB } from "../db/types.js";
import type DatabaseAdapter from "../db/adapter.js";

export default class UserRolesRepository extends BaseRepository<"lucid_user_roles"> {
	constructor(db: KyselyDB, dbAdapter: DatabaseAdapter) {
		super(db, dbAdapter, "lucid_user_roles");
	}
	tableSchema = z.object({
		id: z.number(),
		user_id: z.number(),
		role_id: z.number(),
		updated_at: z.string().nullable(),
		created_at: z.string().nullable(),
	});
	columnFormats = {
		id: this.dbAdapter.getDataType("primary"),
		user_id: this.dbAdapter.getDataType("integer"),
		role_id: this.dbAdapter.getDataType("integer"),
		updated_at: this.dbAdapter.getDataType("timestamp"),
		created_at: this.dbAdapter.getDataType("timestamp"),
	};
	queryConfig = undefined;
}
