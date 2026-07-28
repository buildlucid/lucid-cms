import z from "zod";
import type DatabaseAdapter from "../db/adapter-base.js";
import type { KyselyDB } from "../db/types.js";
import StaticRepository from "./parents/static-repository.js";

export default class OAuthGrantScopesRepository extends StaticRepository<"lucid_oauth_grant_scopes"> {
	constructor(db: KyselyDB, dbAdapter: DatabaseAdapter) {
		super(db, dbAdapter, "lucid_oauth_grant_scopes");
	}
	tableSchema = z.object({
		id: z.number(),
		grant_id: z.number(),
		scope: z.string(),
		created_at: z.union([z.string(), z.date()]),
	});
	columnFormats = {
		id: this.dbAdapter.getDataType("primary"),
		grant_id: this.dbAdapter.getDataType("integer"),
		scope: this.dbAdapter.getDataType("text"),
		created_at: this.dbAdapter.getDataType("timestamp"),
	};
	queryConfig = undefined;
}
