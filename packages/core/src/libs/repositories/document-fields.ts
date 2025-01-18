import z from "zod";
import DynamicRepository from "./parents/dynamic-repository.js";
import type { LucidFieldTableName } from "../db/types.js";

export default class DocumentFieldsRepository extends DynamicRepository<LucidFieldTableName> {
	tableSchema = z.object({
		id: z.number(),
		collection_key: z.string(),
		document_id: z.number(),
		document_version_id: z.number(),
		locale: z.string(),
		// repeater specific
		parent_id: z.string().optional(),
		sort_order: z.number().optional(),
	});
	columnFormats = {
		id: this.dbAdapter.getDataType("primary"),
		collection_key: this.dbAdapter.getDataType("text"),
		document_id: this.dbAdapter.getDataType("integer"),
		document_version_id: this.dbAdapter.getDataType("integer"),
		locale: this.dbAdapter.getDataType("text"),
		// repeater specific
		parent_id: this.dbAdapter.getDataType("integer"),
		sort_order: this.dbAdapter.getDataType("integer"),
	};
	queryConfig = undefined;
}
