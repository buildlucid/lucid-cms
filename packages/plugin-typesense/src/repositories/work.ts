import { z } from "@lucidcms/core";
import type { ServiceContext, ServiceResponse } from "@lucidcms/core/types";
import type { UpdateResult } from "kysely";
import batches from "../utils/batches.js";
import type { PendingWork, PluginTables } from "./types.js";
import { pendingWorkSchema } from "./types.js";

export default class WorkRepository {
	constructor(private readonly database: ServiceContext["db"]) {}

	async put(data: {
		indexKey: string;
		sourceKey: string;
		ids: readonly number[];
		revision: string;
	}): ServiceResponse<undefined> {
		const ids = [...new Set(data.ids)];
		if (ids.length === 0) return { error: undefined, data: undefined };
		for (const batch of batches(
			ids,
			this.database.adapter.getQueryBatchSize({
				parametersPerItem: 5,
				reservedParameters: 2,
				maxItems: 200,
			}),
		)) {
			const result = await this.database
				.query("typesense.work.put", (db) =>
					db
						.$extendTables<PluginTables>()
						.insertInto("plugin_typesense_work")
						.values(
							batch.map((id) => ({
								index_key: data.indexKey,
								source_key: data.sourceKey,
								document_id: id,
								revision: data.revision,
								cursor: 0,
							})),
						)
						.onConflict((conflict) =>
							conflict
								.columns(["index_key", "source_key", "document_id"])
								.doUpdateSet({ revision: data.revision, cursor: 0 }),
						),
				)
				.first();
			if (result.error) return result;
		}
		return { error: undefined, data: undefined };
	}
	async next(data: {
		indexKey: string;
		limit: number;
	}): ServiceResponse<PendingWork[]> {
		return this.database
			.query("typesense.work.next", (db) =>
				db
					.$extendTables<PluginTables>()
					.selectFrom("plugin_typesense_work")
					.selectAll()
					.where("index_key", "=", data.indexKey)
					.orderBy("document_id")
					.orderBy("source_key")
					.limit(data.limit),
			)
			.many({ schema: pendingWorkSchema });
	}
	/** A concurrent notification changes the revision and keeps its work pending. */
	async finish(rows: readonly PendingWork[]): ServiceResponse<undefined> {
		for (const batch of batches(
			rows,
			this.database.adapter.getQueryBatchSize({
				parametersPerItem: 4,
				maxItems: 100,
			}),
		)) {
			const finished = await this.database
				.query("typesense.work.finish", (db) =>
					db
						.$extendTables<PluginTables>()
						.deleteFrom("plugin_typesense_work")
						.where((eb) =>
							eb.or(
								batch.map((row) =>
									eb.and([
										eb("index_key", "=", row.index_key),
										eb("source_key", "=", row.source_key),
										eb("document_id", "=", row.document_id),
										eb("revision", "=", row.revision),
									]),
								),
							),
						),
				)
				.first();
			if (finished.error) return finished;
		}

		return { error: undefined, data: undefined };
	}
	async removeUnknownSources(data: {
		indexKey: string;
		sourceKeys: string[];
	}): ServiceResponse<undefined> {
		const existing = await this.database
			.query("typesense.work.sources", (db) =>
				db
					.$extendTables<PluginTables>()
					.selectFrom("plugin_typesense_work")
					.select("source_key")
					.distinct()
					.where("index_key", "=", data.indexKey),
			)
			.many({ schema: z.object({ source_key: z.string() }) });
		if (existing.error) return existing;

		const configured = new Set(data.sourceKeys);
		const unknown = existing.data
			.filter((row) => !configured.has(row.source_key))
			.map((row) => row.source_key);

		for (const batch of batches(
			unknown,
			this.database.adapter.getQueryBatchSize({
				parametersPerItem: 1,
				reservedParameters: 1,
				maxItems: 200,
			}),
		)) {
			const removed = await this.database
				.query("typesense.work.removeUnknownSources", (db) =>
					db
						.$extendTables<PluginTables>()
						.deleteFrom("plugin_typesense_work")
						.where("index_key", "=", data.indexKey)
						.where("source_key", "in", batch),
				)
				.first();
			if (removed.error) return removed;
		}

		return { error: undefined, data: undefined };
	}
	async advance(
		row: PendingWork,
		cursor: number,
	): ServiceResponse<UpdateResult | undefined> {
		return this.database
			.query("typesense.work.advance", (db) =>
				db
					.$extendTables<PluginTables>()
					.updateTable("plugin_typesense_work")
					.set({ cursor })
					.where("index_key", "=", row.index_key)
					.where("source_key", "=", row.source_key)
					.where("document_id", "=", 0)
					.where("revision", "=", row.revision),
			)
			.first();
	}
	async counts(
		indexKey: string,
	): ServiceResponse<Array<{ source_key: string; pending: string | number }>> {
		return this.database
			.query("typesense.work.counts", (db) =>
				db
					.$extendTables<PluginTables>()
					.selectFrom("plugin_typesense_work")
					.select([
						"source_key",
						(eb) => eb.fn.countAll<string | number>().as("pending"),
					])
					.where("index_key", "=", indexKey)
					.groupBy("source_key"),
			)
			.many({
				schema: z.object({
					source_key: z.string(),
					pending: z.union([z.string(), z.number()]),
				}),
			});
	}
}
