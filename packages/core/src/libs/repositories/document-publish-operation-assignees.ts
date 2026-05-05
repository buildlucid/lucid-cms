import z from "zod";
import type DatabaseAdapter from "../db/adapter-base.js";
import type { KyselyDB } from "../db/types.js";
import StaticRepository from "./parents/static-repository.js";

export default class DocumentPublishOperationAssigneesRepository extends StaticRepository<"lucid_document_publish_operation_assignees"> {
	constructor(db: KyselyDB, dbAdapter: DatabaseAdapter) {
		super(db, dbAdapter, "lucid_document_publish_operation_assignees");
	}
	tableSchema = z.object({
		id: z.number(),
		operation_id: z.number(),
		user_id: z.number(),
		assigned_by: z.number().nullable(),
		assigned_at: z.union([z.string(), z.date()]),
	});
	columnFormats = {
		id: this.dbAdapter.getDataType("primary"),
		operation_id: this.dbAdapter.getDataType("integer"),
		user_id: this.dbAdapter.getDataType("integer"),
		assigned_by: this.dbAdapter.getDataType("integer"),
		assigned_at: this.dbAdapter.getDataType("timestamp"),
	};
	queryConfig = undefined;
}
