import type { ServiceContext, ServiceResponse } from "@lucidcms/core/types";
import type { InsertResult, UpdateResult } from "kysely";
import type { IndexState, PluginTables } from "./types.js";

export default class IndexesRepository {
	constructor(private readonly database: ServiceContext["db"]) {}

	async ensure(indexKey: string): ServiceResponse<InsertResult | undefined> {
		return this.database
			.query("typesense.index.ensure", (db) =>
				db
					.$extendTables<PluginTables>()
					.insertInto("plugin_typesense_indexes")
					.values({
						index_key: indexKey,
						active_collection: null,
						building_collection: null,
						rebuild_id: null,
						rebuild_prepared: null,
						rebuild_requested: null,
						rebuild_completed: null,
						rebuild_processed: 0,
						lock_token: null,
						lock_until: null,
						last_error: null,
						last_success: null,
					})
					.onConflict((conflict) => conflict.column("index_key").doNothing()),
			)
			.first();
	}
	async get(indexKey: string): ServiceResponse<IndexState> {
		return this.database
			.query("typesense.index.get", (db) =>
				db
					.$extendTables<PluginTables>()
					.selectFrom("plugin_typesense_indexes")
					.selectAll()
					.where("index_key", "=", indexKey),
			)
			.first({ required: true });
	}
	/** A conditional write gives one worker ownership across supported databases. */
	async claim(data: {
		indexKey: string;
		token: string;
		now: string;
		until: string;
	}): ServiceResponse<IndexState | undefined> {
		return this.database
			.query("typesense.index.claim", (db) =>
				db
					.$extendTables<PluginTables>()
					.updateTable("plugin_typesense_indexes")
					.set({ lock_token: data.token, lock_until: data.until })
					.where("index_key", "=", data.indexKey)
					.where((eb) =>
						eb.or([
							eb("lock_token", "is", null),
							eb("lock_until", "<", data.now),
						]),
					)
					.returningAll(),
			)
			.first();
	}
	async update(data: {
		indexKey: string;
		token: string;
		values: Partial<Omit<IndexState, "index_key" | "lock_token">>;
	}): ServiceResponse<Pick<IndexState, "index_key">> {
		return this.database
			.query("typesense.index.update", (db) =>
				db
					.$extendTables<PluginTables>()
					.updateTable("plugin_typesense_indexes")
					.set(data.values)
					.where("index_key", "=", data.indexKey)
					.where("lock_token", "=", data.token)
					.returning("index_key"),
			)
			.first({ required: true });
	}
	async release(data: {
		indexKey: string;
		token: string;
	}): ServiceResponse<UpdateResult | undefined> {
		return this.database
			.query("typesense.index.release", (db) =>
				db
					.$extendTables<PluginTables>()
					.updateTable("plugin_typesense_indexes")
					.set({ lock_token: null, lock_until: null })
					.where("index_key", "=", data.indexKey)
					.where("lock_token", "=", data.token),
			)
			.first();
	}
}
