import z from "zod";
import DynamicRepository from "./parents/dynamic-repository.js";
import type { LucidVersionTableName } from "../db/types.js";

export default class DocumentVersionsRepository extends DynamicRepository<LucidVersionTableName> {
	tableSchema = z.object({
		id: z.number(),
		collection_key: z.string(),
		document_id: z.number(),
		type: z.union([
			z.literal("draft"),
			z.literal("revision"),
			z.literal("published"),
		]),
		created_by: z.number(),
		updated_by: z.number(),
		updated_at: z.string().nullable(),
		created_at: z.string().nullable(),
	});
	columnFormats = {
		id: this.dbAdapter.getDataType("primary"),
		collection_key: this.dbAdapter.getDataType("text"),
		document_id: this.dbAdapter.getDataType("integer"),
		type: this.dbAdapter.getDataType("text"),
		created_by: this.dbAdapter.getDataType("integer"),
		updated_by: this.dbAdapter.getDataType("integer"),
		updated_at: this.dbAdapter.getDataType("timestamp"),
		created_at: this.dbAdapter.getDataType("timestamp"),
	};
	queryConfig = undefined;
}
