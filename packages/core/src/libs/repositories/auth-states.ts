import z from "zod/v4";
import type DatabaseAdapter from "../db-adapter/adapter-base.js";
import type { KyselyDB } from "../db-adapter/types.js";
import StaticRepository from "./parents/static-repository.js";

export default class AuthStatesRepository extends StaticRepository<"lucid_auth_states"> {
	constructor(db: KyselyDB, dbAdapter: DatabaseAdapter) {
		super(db, dbAdapter, "lucid_auth_states");
	}
	tableSchema = z.object({
		id: z.number(),
		state: z.string(),
		provider_key: z.string(),
		action_type: z.string(),
		invitation_token_id: z.number().nullable(),
		redirect_path: z.string().nullable(),
		expiry_date: z.union([z.string(), z.date()]),
		created_at: z.union([z.string(), z.date()]),
	});
	columnFormats = {
		id: this.dbAdapter.getDataType("primary"),
		state: this.dbAdapter.getDataType("text"),
		provider_key: this.dbAdapter.getDataType("text"),
		action_type: this.dbAdapter.getDataType("text"),
		invitation_token_id: this.dbAdapter.getDataType("integer"),
		redirect_path: this.dbAdapter.getDataType("text"),
		expiry_date: this.dbAdapter.getDataType("timestamp"),
		created_at: this.dbAdapter.getDataType("timestamp"),
	};
	queryConfig = undefined;
}
