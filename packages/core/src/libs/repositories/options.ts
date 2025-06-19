import z from "zod/v4";
import StaticRepository from "./parents/static-repository.js";
import type { KyselyDB } from "../db/types.js";
import type DatabaseAdapter from "../db/adapter.js";

export default class OptionsRepository extends StaticRepository<"lucid_options"> {
	constructor(db: KyselyDB, dbAdapter: DatabaseAdapter) {
		super(db, dbAdapter, "lucid_options");
	}
	tableSchema = z.object({
		name: z.literal("media_storage_used"),
		value_int: z.number().nullable(),
		value_text: z.string().nullable(),
		value_bool: z
			.union([
				z.literal(this.dbAdapter.config.defaults.boolean.true),
				z.literal(this.dbAdapter.config.defaults.boolean.false),
			])
			.nullable(),
	});
	columnFormats = {
		name: this.dbAdapter.getDataType("text"),
		value_int: this.dbAdapter.getDataType("integer"),
		value_text: this.dbAdapter.getDataType("text"),
		value_bool: this.dbAdapter.getDataType("boolean"),
	};
	queryConfig = undefined;
}
