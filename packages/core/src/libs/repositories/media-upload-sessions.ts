import z from "zod";
import type DatabaseAdapter from "../db/adapter-base.js";
import type { KyselyDB } from "../db/types.js";
import StaticRepository from "./parents/static-repository.js";

export default class MediaUploadSessionsRepository extends StaticRepository<"lucid_media_upload_sessions"> {
	constructor(db: KyselyDB, dbAdapter: DatabaseAdapter) {
		super(db, dbAdapter, "lucid_media_upload_sessions");
	}
	tableSchema = z.object({
		session_id: z.string(),
		key: z.string(),
		adapter_key: z.string(),
		adapter_upload_id: z.string().nullable(),
		mode: z.enum(["single", "resumable"]),
		status: z.enum(["active", "completed", "aborted"]),
		file_name: z.string(),
		mime_type: z.string(),
		file_extension: z.string().nullable(),
		file_size: z.number(),
		part_size: z.number().nullable(),
		created_by: z.number().nullable(),
		created_at: z.union([z.string(), z.date()]),
		updated_at: z.union([z.string(), z.date()]).nullable(),
		expires_at: z.union([z.string(), z.date()]).nullable(),
	});
	columnFormats = {
		session_id: this.dbAdapter.getDataType("text"),
		key: this.dbAdapter.getDataType("text"),
		adapter_key: this.dbAdapter.getDataType("text"),
		adapter_upload_id: this.dbAdapter.getDataType("text"),
		mode: this.dbAdapter.getDataType("text"),
		status: this.dbAdapter.getDataType("text"),
		file_name: this.dbAdapter.getDataType("text"),
		mime_type: this.dbAdapter.getDataType("text"),
		file_extension: this.dbAdapter.getDataType("text"),
		file_size: this.dbAdapter.getDataType("integer"),
		part_size: this.dbAdapter.getDataType("integer"),
		created_by: this.dbAdapter.getDataType("integer"),
		created_at: this.dbAdapter.getDataType("timestamp"),
		updated_at: this.dbAdapter.getDataType("timestamp"),
		expires_at: this.dbAdapter.getDataType("timestamp"),
	};
	queryConfig = undefined;
}
