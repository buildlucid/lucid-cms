import z from "zod/v4";
import StaticRepository from "./parents/static-repository.js";
import type { KyselyDB } from "../db/types.js";
import type DatabaseAdapter from "../db/adapter.js";

export default class TranslationKeysRepository extends StaticRepository<"lucid_translation_keys"> {
	constructor(db: KyselyDB, dbAdapter: DatabaseAdapter) {
		super(db, dbAdapter, "lucid_translation_keys");
	}
	tableSchema = z.object({
		id: z.number(),
		created_at: z.string(),
	});
	columnFormats = {
		id: this.dbAdapter.getDataType("primary"),
		created_at: this.dbAdapter.getDataType("timestamp"),
	};
	queryConfig = undefined;
}
