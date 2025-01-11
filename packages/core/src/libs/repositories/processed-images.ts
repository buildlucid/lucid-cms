import z from "zod";
import BaseRepository from "./base-repository.js";
import type { KyselyDB } from "../db/types.js";
import type DatabaseAdapter from "../db/adapter.js";

export default class ProcessedImagesRepository extends BaseRepository<"lucid_processed_images"> {
	constructor(db: KyselyDB, dbAdapter: DatabaseAdapter) {
		super(db, dbAdapter, "lucid_processed_images");
	}
	tableSchema = z.object({
		key: z.string(),
		media_key: z.string(),
		file_size: z.number(),
	});
	columnFormats = {
		key: this.dbAdapter.getDataType("text"),
		media_key: this.dbAdapter.getDataType("text"),
		file_size: this.dbAdapter.getDataType("integer"),
	};
	queryConfig = undefined;
}
