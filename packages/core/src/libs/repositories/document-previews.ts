import z from "zod";
import type DatabaseAdapter from "../db/adapter-base.js";
import type { KyselyDB } from "../db/types.js";
import StaticRepository from "./parents/static-repository.js";

export default class DocumentPreviewsRepository extends StaticRepository<"lucid_document_previews"> {
	constructor(db: KyselyDB, dbAdapter: DatabaseAdapter) {
		super(db, dbAdapter, "lucid_document_previews");
	}
	tableSchema = z.object({
		id: z.number(),
		token_hash: z.string(),
		collection_key: z.string(),
		document_id: z.number(),
		version_type: z.string(),
		version_id: z.number().nullable(),
		tenant_key: z.string().nullable(),
		expires_at: z.union([z.string(), z.date()]),
		created_by: z.number().nullable(),
		created_at: z.union([z.string(), z.date()]),
	});
	columnFormats = {
		id: this.dbAdapter.getDataType("primary"),
		token_hash: this.dbAdapter.getDataType("char", 64),
		collection_key: this.dbAdapter.getDataType("text"),
		document_id: this.dbAdapter.getDataType("integer"),
		version_type: this.dbAdapter.getDataType("varchar", 255),
		version_id: this.dbAdapter.getDataType("integer"),
		tenant_key: this.dbAdapter.getDataType("varchar", 255),
		expires_at: this.dbAdapter.getDataType("timestamp"),
		created_by: this.dbAdapter.getDataType("integer"),
		created_at: this.dbAdapter.getDataType("timestamp"),
	};
	queryConfig = undefined;
}
