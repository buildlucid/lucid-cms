import type { KyselyDB } from "../db/types.js";
import type DatabaseAdapter from "../db/adapter.js";
import type { MigrationPlan } from "../../services/collection-migrator/migration/types.js";

export default class CollectionMigrationsRepo {
	constructor(
		private db: KyselyDB,
		private dbAdapter: DatabaseAdapter,
	) {}

	// ----------------------------------------
	// create
	createMultiple = async (props: {
		items: Array<{
			collectionKey: string;
			migrationPlans: MigrationPlan;
		}>;
	}) => {
		return this.db
			.insertInto("lucid_collection_migrations")
			.values(
				props.items.map((i) => ({
					collection_key: i.collectionKey,
					migration_plans: this.dbAdapter.formatInsertValue<string>(
						"json",
						i.migrationPlans,
					),
				})),
			)
			.execute();
	};
}
