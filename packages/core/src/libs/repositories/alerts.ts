import z from "zod";
import type DatabaseAdapter from "../db/adapter-base.js";
import type { KyselyDB } from "../db/types.js";
import StaticRepository from "./parents/static-repository.js";

export default class AlertsRepository extends StaticRepository<"lucid_alerts"> {
	constructor(db: KyselyDB, dbAdapter: DatabaseAdapter) {
		super(db, dbAdapter, "lucid_alerts");
	}
	tableSchema = z.object({
		id: z.number(),
		type: z.enum(["storage"]),
		level: z.enum(["info", "warning", "error", "critical"]),
		dedupe_key: z.string(),
		title: z.string(),
		message: z.string(),
		metadata: z.record(z.string(), z.unknown()),
		email_id: z.number().nullable(),
		created_at: z.union([z.string(), z.date()]),
	});
	columnFormats = {
		id: this.dbAdapter.getDataType("primary"),
		type: this.dbAdapter.getDataType("text"),
		level: this.dbAdapter.getDataType("text"),
		dedupe_key: this.dbAdapter.getDataType("text"),
		title: this.dbAdapter.getDataType("text"),
		message: this.dbAdapter.getDataType("text"),
		metadata: this.dbAdapter.getDataType("json"),
		email_id: this.dbAdapter.getDataType("integer"),
		created_at: this.dbAdapter.getDataType("timestamp"),
	};
	queryConfig = undefined;
}
