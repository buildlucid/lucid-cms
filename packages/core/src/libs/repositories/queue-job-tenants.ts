import z from "zod";
import type DatabaseAdapter from "../db/adapter-base.js";
import type { KyselyDB } from "../db/types.js";
import StaticRepository from "./parents/static-repository.js";

export default class QueueJobTenantsRepository extends StaticRepository<"lucid_queue_job_tenants"> {
	constructor(db: KyselyDB, dbAdapter: DatabaseAdapter) {
		super(db, dbAdapter, "lucid_queue_job_tenants");
	}
	tableSchema = z.object({
		id: z.number(),
		queue_job_id: z.number(),
		tenant_key: z.string(),
		updated_at: z.union([z.string(), z.date()]).nullable(),
		created_at: z.union([z.string(), z.date()]).nullable(),
	});
	columnFormats = {
		id: this.dbAdapter.getDataType("primary"),
		queue_job_id: this.dbAdapter.getDataType("integer"),
		tenant_key: this.dbAdapter.getDataType("text"),
		updated_at: this.dbAdapter.getDataType("timestamp"),
		created_at: this.dbAdapter.getDataType("timestamp"),
	};
	queryConfig = undefined;
}
