import z from "zod";
import type DatabaseAdapter from "../db/adapter-base.js";
import type { KyselyDB } from "../db/types.js";
import StaticRepository from "./parents/static-repository.js";

export default class DocumentPublishOperationEventsRepository extends StaticRepository<"lucid_document_publish_operation_events"> {
	constructor(db: KyselyDB, dbAdapter: DatabaseAdapter) {
		super(db, dbAdapter, "lucid_document_publish_operation_events");
	}
	tableSchema = z.object({
		id: z.number(),
		operation_id: z.number(),
		event_type: z.enum([
			"created",
			"superseded",
			"approved",
			"rejected",
			"cancelled",
		]),
		user_id: z.number().nullable(),
		comment: z.string().nullable(),
		metadata: z.record(z.string(), z.unknown()),
		created_at: z.union([z.string(), z.date()]),
	});
	columnFormats = {
		id: this.dbAdapter.getDataType("primary"),
		operation_id: this.dbAdapter.getDataType("integer"),
		event_type: this.dbAdapter.getDataType("text"),
		user_id: this.dbAdapter.getDataType("integer"),
		comment: this.dbAdapter.getDataType("text"),
		metadata: this.dbAdapter.getDataType("json"),
		created_at: this.dbAdapter.getDataType("timestamp"),
	};
	queryConfig = undefined;
}
