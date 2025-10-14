import z from "zod/v4";
import type DatabaseAdapter from "../db-adapter/adapter-base.js";
import type { KyselyDB } from "../db-adapter/types.js";
import StaticRepository from "./parents/static-repository.js";

export default class UserRolesRepository extends StaticRepository<"lucid_user_roles"> {
	constructor(db: KyselyDB, dbAdapter: DatabaseAdapter) {
		super(db, dbAdapter, "lucid_user_roles");
	}
	tableSchema = z.object({
		id: z.number(),
		user_id: z.number(),
		role_id: z.number(),
		updated_at: z.union([z.string(), z.date()]).nullable(),
		created_at: z.union([z.string(), z.date()]).nullable(),
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
