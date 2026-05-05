import z from "zod";
import type DatabaseAdapter from "../db/adapter-base.js";
import type { KyselyDB } from "../db/types.js";
import StaticRepository from "./parents/static-repository.js";

export default class AlertRecipientsRepository extends StaticRepository<"lucid_alert_recipients"> {
	constructor(db: KyselyDB, dbAdapter: DatabaseAdapter) {
		super(db, dbAdapter, "lucid_alert_recipients");
	}
	tableSchema = z.object({
		id: z.number(),
		alert_id: z.number(),
		user_id: z.number(),
		read_at: z.union([z.string(), z.date()]).nullable(),
		dismissed_at: z.union([z.string(), z.date()]).nullable(),
		created_at: z.union([z.string(), z.date()]),
	});
	columnFormats = {
		id: this.dbAdapter.getDataType("primary"),
		alert_id: this.dbAdapter.getDataType("integer"),
		user_id: this.dbAdapter.getDataType("integer"),
		read_at: this.dbAdapter.getDataType("timestamp"),
		dismissed_at: this.dbAdapter.getDataType("timestamp"),
		created_at: this.dbAdapter.getDataType("timestamp"),
	};
	queryConfig = undefined;
}
