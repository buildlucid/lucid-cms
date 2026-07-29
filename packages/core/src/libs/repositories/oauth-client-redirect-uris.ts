import z from "zod";
import type DatabaseAdapter from "../db/adapter-base.js";
import type { KyselyDB } from "../db/types.js";
import StaticRepository from "./parents/static-repository.js";

export default class OAuthClientRedirectUrisRepository extends StaticRepository<"lucid_oauth_client_redirect_uris"> {
	constructor(db: KyselyDB, dbAdapter: DatabaseAdapter) {
		super(db, dbAdapter, "lucid_oauth_client_redirect_uris");
	}
	tableSchema = z.object({
		id: z.number(),
		oauth_client_id: z.number(),
		redirect_uri: z.string(),
		created_at: z.union([z.string(), z.date()]),
	});

	columnFormats = {
		id: this.dbAdapter.getDataType("primary"),
		oauth_client_id: this.dbAdapter.getDataType("integer"),
		redirect_uri: this.dbAdapter.getDataType("text"),
		created_at: this.dbAdapter.getDataType("timestamp"),
	};
	queryConfig = undefined;
}
