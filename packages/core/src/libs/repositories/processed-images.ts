import z from "zod/v4";
import type DatabaseAdapter from "../db-adapter/adapter-base.js";
import type { KyselyDB } from "../db-adapter/types.js";
import StaticRepository from "./parents/static-repository.js";

export default class ProcessedImagesRepository extends StaticRepository<"lucid_processed_images"> {
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
