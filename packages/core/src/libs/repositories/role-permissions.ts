import z from "zod";
import type DatabaseAdapter from "../db-adapter/adapter-base.js";
import type { KyselyDB } from "../db-adapter/types.js";
import StaticRepository from "./parents/static-repository.js";

export default class RolePermissionsRepository extends StaticRepository<"lucid_role_permissions"> {
	constructor(db: KyselyDB, dbAdapter: DatabaseAdapter) {
		super(db, dbAdapter, "lucid_role_permissions");
	}
	tableSchema = z.object({
		id: z.number(),
		role_id: z.number(),
		permission: z.string(),
		core: z.union([
			z.literal(this.dbAdapter.config.defaults.boolean.true),
			z.literal(this.dbAdapter.config.defaults.boolean.false),
		]),
		created_at: z.union([z.string(), z.date()]).nullable(),
		updated_at: z.union([z.string(), z.date()]).nullable(),
	});
	columnFormats = {
		id: this.dbAdapter.getDataType("primary"),
		role_id: this.dbAdapter.getDataType("integer"),
		permission: this.dbAdapter.getDataType("text"),
		core: this.dbAdapter.getDataType("boolean"),
		created_at: this.dbAdapter.getDataType("timestamp"),
		updated_at: this.dbAdapter.getDataType("timestamp"),
	};
	queryConfig = undefined;
}
