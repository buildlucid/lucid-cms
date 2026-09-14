import type { ServiceContext, ServiceResponse } from "@lucidcms/core/types";
import type { DeleteResult, InsertResult } from "kysely";
import type { Generation, PluginTables } from "./types.js";

/** Tracks only collections created by this plugin, including interrupted rebuilds. */
export default class GenerationsRepository {
	constructor(private readonly database: ServiceContext["db"]) {}

	async create(data: Generation): ServiceResponse<InsertResult | undefined> {
		return this.database
			.query("typesense.generation.create", (db) =>
				db
					.$extendTables<PluginTables>()
					.insertInto("plugin_typesense_generations")
					.values(data)
					.onConflict((conflict) =>
						conflict.column("collection_name").doNothing(),
					),
			)
			.first();
	}
	async obsolete(data: {
		indexKey: string;
		retain: string[];
	}): ServiceResponse<Generation | undefined> {
		return this.database
			.query("typesense.generation.obsolete", (db) =>
				db
					.$extendTables<PluginTables>()
					.selectFrom("plugin_typesense_generations")
					.selectAll()
					.where("index_key", "=", data.indexKey)
					.where("collection_name", "not in", data.retain)
					.orderBy("collection_name")
					.limit(1),
			)
			.first();
	}
	async remove(collection: string): ServiceResponse<DeleteResult | undefined> {
		return this.database
			.query("typesense.generation.remove", (db) =>
				db
					.$extendTables<PluginTables>()
					.deleteFrom("plugin_typesense_generations")
					.where("collection_name", "=", collection),
			)
			.first();
	}
}
