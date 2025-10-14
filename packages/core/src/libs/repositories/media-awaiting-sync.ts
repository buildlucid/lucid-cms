import z from "zod/v4";
import StaticRepository from "./parents/static-repository.js";
import type { KyselyDB } from "../db-adapter/types.js";
import type DatabaseAdapter from "../db-adapter/adapter-base.js";

export default class MediaAwaitingSyncRepository extends StaticRepository<"lucid_media_awaiting_sync"> {
	constructor(db: KyselyDB, dbAdapter: DatabaseAdapter) {
		super(db, dbAdapter, "lucid_media_awaiting_sync");
	}
	tableSchema = z.object({
		key: z.string(),
		timestamp: z.union([z.string(), z.date()]),
	});
	columnFormats = {
		key: this.dbAdapter.getDataType("text"),
		timestamp: this.dbAdapter.getDataType("timestamp"),
	};
	queryConfig = undefined;
}
