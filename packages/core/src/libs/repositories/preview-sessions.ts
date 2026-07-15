import z from "zod";
import type DatabaseAdapter from "../db/adapter-base.js";
import type { KyselyDB } from "../db/types.js";
import StaticRepository from "./parents/static-repository.js";

export default class PreviewSessionsRepository extends StaticRepository<"lucid_preview_sessions"> {
	constructor(db: KyselyDB, dbAdapter: DatabaseAdapter) {
		super(db, dbAdapter, "lucid_preview_sessions");
	}
	tableSchema = z.object({
		id: z.number(),
		token_hash: z.string(),
		entry_collection_key: z.string(),
		entry_document_id: z.number(),
		entry_version_type: z.string(),
		entry_version_id: z.number().nullable(),
		expires_at: z.union([z.string(), z.date()]),
		created_by: z.number().nullable(),
		created_at: z.union([z.string(), z.date()]),
	});
	columnFormats = {
		id: this.dbAdapter.getDataType("primary"),
		token_hash: this.dbAdapter.getDataType("char", 64),
		entry_collection_key: this.dbAdapter.getDataType("text"),
		entry_document_id: this.dbAdapter.getDataType("integer"),
		entry_version_type: this.dbAdapter.getDataType("varchar", 255),
		entry_version_id: this.dbAdapter.getDataType("integer"),
		expires_at: this.dbAdapter.getDataType("timestamp"),
		created_by: this.dbAdapter.getDataType("integer"),
		created_at: this.dbAdapter.getDataType("timestamp"),
	};
	queryConfig = undefined;
}
