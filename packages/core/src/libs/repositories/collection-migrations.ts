import z from "zod";
import type DatabaseAdapter from "../db-adapter/adapter-base.js";
import type {
	KyselyDB,
	LucidCollectionMigrations,
	Select,
} from "../db-adapter/types.js";
import StaticRepository from "./parents/static-repository.js";

export default class CollectionMigrationsRepository extends StaticRepository<"lucid_collection_migrations"> {
	constructor(db: KyselyDB, dbAdapter: DatabaseAdapter) {
		super(db, dbAdapter, "lucid_collection_migrations");
	}
	tableSchema = z.object({
		id: z.number(),
		collection_key: z.string(),
		migration_plans: z.unknown(),
		collection_schema: z.unknown(),
		created_at: z.union([z.string(), z.date()]).nullable(),
	});
	columnFormats = {
		id: this.dbAdapter.getDataType("primary"),
		collection_key: this.dbAdapter.getDataType("text"),
		migration_plans: this.dbAdapter.getDataType("json"),
		collection_schema: this.dbAdapter.getDataType("json"),
		created_at: this.dbAdapter.getDataType("timestamp"),
	};
	queryConfig = undefined;

	/**
	 * Returns the latest migration row for a collection.
	 */
	async selectLatestByCollectionKey(props: { collectionKey: string }) {
		const query = this.db
			.selectFrom(this.tableName)
			.selectAll()
			.where("collection_key", "=", props.collectionKey)
			.orderBy("id", "desc")
			.limit(1);

		const exec = await this.executeQuery(
			() =>
				query.executeTakeFirst() as Promise<
					Select<LucidCollectionMigrations> | undefined
				>,
			{
				method: "selectLatestByCollectionKey",
			},
		);
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			enabled: false,
			mode: "single",
		});
	}

	/**
	 * Returns latest migration rows grouped by collection key.
	 */
	async selectLatestByCollectionKeysMap(props: { collectionKeys: string[] }) {
		if (props.collectionKeys.length === 0) {
			return {
				error: undefined,
				data: new Map<string, Select<LucidCollectionMigrations>>(),
			};
		}

		const latestIdsQuery = this.db
			.selectFrom(this.tableName)
			.select(["collection_key", (eb) => eb.fn.max("id").as("latest_id")])
			.where("collection_key", "in", props.collectionKeys)
			.groupBy("collection_key")
			.as("latest_ids");

		const query = this.db
			.selectFrom("lucid_collection_migrations as cm")
			.innerJoin(latestIdsQuery, (join) =>
				join
					.onRef("cm.collection_key", "=", "latest_ids.collection_key")
					.onRef("cm.id", "=", "latest_ids.latest_id"),
			)
			.selectAll("cm");

		const exec = await this.executeQuery(
			() => query.execute() as Promise<Select<LucidCollectionMigrations>[]>,
			{
				method: "selectLatestByCollectionKeysMap",
			},
		);
		if (exec.response.error) return exec.response;

		const latestByCollection = new Map<
			string,
			Select<LucidCollectionMigrations>
		>();
		for (const row of exec.response.data) {
			if (latestByCollection.has(row.collection_key)) continue;
			latestByCollection.set(row.collection_key, row);
		}

		return {
			error: undefined,
			data: latestByCollection,
		};
	}
}
