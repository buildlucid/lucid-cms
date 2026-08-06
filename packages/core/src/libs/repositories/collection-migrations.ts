import type { LucidDatabase } from "../db/client/index.js";
import { collectionMigrationsTable } from "../db/tables/collection-migrations.js";
import type { LucidCollectionMigrations } from "../db/tables/index.js";
import type { Select } from "../db/types.js";
import StaticRepository from "./parents/static-repository.js";
import type { QueryProps } from "./types.js";

export default class CollectionMigrationsRepository extends StaticRepository<"lucid_collection_migrations"> {
	constructor(db: LucidDatabase) {
		super(db, collectionMigrationsTable);
	}

	/**
	 * Returns the latest migration row for a collection.
	 */
	async selectLatestByCollectionKey<V extends boolean = false>(
		props: QueryProps<
			V,
			{
				collectionKey: string;
			}
		>,
	) {
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
			...props.validation,
			mode: "single",
			selectAll: true,
		});
	}
	/**
	 * Returns the latest migration row for each collection key.
	 */
	async selectLatestByCollectionKeysMap<V extends boolean = false>(
		props: QueryProps<
			V,
			{
				collectionKeys: string[];
			}
		>,
	) {
		if (props.collectionKeys.length === 0) {
			return {
				error: undefined,
				data: [],
			};
		}

		const query = this.db
			.selectFrom("lucid_collection_migrations as cm")
			.innerJoin(
				this.db
					.selectFrom(this.tableName)
					.select(["collection_key", (eb) => eb.fn.max("id").as("latest_id")])
					.where("collection_key", "in", props.collectionKeys)
					.groupBy("collection_key")
					.as("latest_ids"),
				(join) =>
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

		return this.validateResponse(exec, {
			...props.validation,
			mode: "multiple",
			selectAll: true,
		});
	}
}
