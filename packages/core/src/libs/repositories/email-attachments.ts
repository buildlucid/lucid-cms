import z from "zod";
import type DatabaseAdapter from "../db/adapter-base.js";
import type { KyselyDB } from "../db/types.js";
import StaticRepository from "./parents/static-repository.js";

export default class EmailAttachmentsRepository extends StaticRepository<"lucid_email_attachments"> {
	constructor(db: KyselyDB, dbAdapter: DatabaseAdapter) {
		super(db, dbAdapter, "lucid_email_attachments");
	}
	tableSchema = z.object({
		id: z.number(),
		email_id: z.number(),
		type: z.literal("url"),
		url: z.string(),
		filename: z.string(),
		content_type: z.string().nullable(),
		disposition: z.union([z.literal("attachment"), z.literal("inline")]),
		content_id: z.string().nullable(),
		order: z.number(),
		created_at: z.union([z.string(), z.date()]).nullable(),
		updated_at: z.union([z.string(), z.date()]).nullable(),
	});
	columnFormats = {
		id: this.dbAdapter.getDataType("primary"),
		email_id: this.dbAdapter.getDataType("integer"),
		type: this.dbAdapter.getDataType("text"),
		url: this.dbAdapter.getDataType("text"),
		filename: this.dbAdapter.getDataType("text"),
		content_type: this.dbAdapter.getDataType("text"),
		disposition: this.dbAdapter.getDataType("text"),
		content_id: this.dbAdapter.getDataType("text"),
		order: this.dbAdapter.getDataType("integer"),
		created_at: this.dbAdapter.getDataType("timestamp"),
		updated_at: this.dbAdapter.getDataType("timestamp"),
	};
	queryConfig = undefined;
}
