import z from "zod";
import DynamicRepository from "./parents/dynamic-repository.js";
import type { LucidBrickTableName } from "../db/types.js";
import type { KyselyDB } from "../db/types.js";
import type DatabaseAdapter from "../db/adapter.js";

export default class DocumentBricksRepository extends DynamicRepository<LucidBrickTableName> {
	constructor(db: KyselyDB, dbAdapter: DatabaseAdapter) {
		super(db, dbAdapter, "lucid_document__collection-key__fields");
	}
	tableSchema = z.object({
		_id: z.number(),
		_collection_key: z.string(),
		_document_id: z.number(),
		_document_version_id: z.number(),
		_locale: z.string(),
		_position: z.number().optional(),
		_is_open: z.union([
			z.literal(this.dbAdapter.config.defaults.boolean.true),
			z.literal(this.dbAdapter.config.defaults.boolean.false),
		]),
		// repeater specific
		_parent_id: z.string().optional(),
		_parent_id_ref: z.string().optional(),
	});
	columnFormats = {
		_id: this.dbAdapter.getDataType("primary"),
		_collection_key: this.dbAdapter.getDataType("text"),
		_document_id: this.dbAdapter.getDataType("integer"),
		_document_version_id: this.dbAdapter.getDataType("integer"),
		_locale: this.dbAdapter.getDataType("text"),
		_position: this.dbAdapter.getDataType("integer"),
		_is_open: this.dbAdapter.getDataType("boolean"),
		// repeater specific
		_parent_id: this.dbAdapter.getDataType("integer"),
		_parent_id_ref: this.dbAdapter.getDataType("integer"),
	};
	queryConfig = undefined;
}
