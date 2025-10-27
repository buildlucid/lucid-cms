import z from "zod/v4";
import constants from "../../constants/constants.js";
import type DatabaseAdapter from "../db-adapter/adapter-base.js";
import type { KyselyDB } from "../db-adapter/types.js";
import StaticRepository from "./parents/static-repository.js";

export default class UserTokensRepository extends StaticRepository<"lucid_user_tokens"> {
	constructor(db: KyselyDB, dbAdapter: DatabaseAdapter) {
		super(db, dbAdapter, "lucid_user_tokens");
	}
	tableSchema = z.object({
		id: z.number(),
		user_id: z.number(),
		token_type: z.union([
			z.literal(constants.userTokens.passwordReset),
			z.literal(constants.userTokens.refresh),
			z.literal(constants.userTokens.invitation),
		]),
		token: z.string(),
		created_at: z.union([z.string(), z.date()]).nullable(),
		expiry_date: z.union([z.string(), z.date()]),
	});
	columnFormats = {
		id: this.dbAdapter.getDataType("primary"),
		user_id: this.dbAdapter.getDataType("integer"),
		token_type: this.dbAdapter.getDataType("varchar", 255),
		token: this.dbAdapter.getDataType("varchar", 255),
		created_at: this.dbAdapter.getDataType("timestamp"),
		expiry_date: this.dbAdapter.getDataType("timestamp"),
	};
	queryConfig = undefined;
}
