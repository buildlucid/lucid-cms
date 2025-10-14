import z from "zod/v4";
import StaticRepository from "./parents/static-repository.js";
import type { KyselyDB } from "../db-adapter/types.js";
import type DatabaseAdapter from "../db-adapter/adapter-base.js";

export default class UserLoginsRepository extends StaticRepository<"lucid_user_logins"> {
	constructor(db: KyselyDB, dbAdapter: DatabaseAdapter) {
		super(db, dbAdapter, "lucid_user_logins");
	}
	tableSchema = z.object({
		id: z.number(),
		user_id: z.number(),
		token_id: z.number().nullable(),
		auth_method: z.string(),
		ip_address: z.string().nullable(),
		user_agent: z.string().nullable(),
		created_at: z.union([z.string(), z.date()]).nullable(),
	});
	columnFormats = {
		id: this.dbAdapter.getDataType("primary"),
		user_id: this.dbAdapter.getDataType("integer"),
		token_id: this.dbAdapter.getDataType("integer"),
		auth_method: this.dbAdapter.getDataType("text"),
		ip_address: this.dbAdapter.getDataType("varchar", 255),
		user_agent: this.dbAdapter.getDataType("text"),
		created_at: this.dbAdapter.getDataType("timestamp"),
	};
	queryConfig = {
		tableKeys: {
			filters: {
				authMethod: "auth_method",
				ipAddress: "ip_address",
			},
			sorts: {
				createdAt: "created_at",
			},
		},
	} as const;
}
