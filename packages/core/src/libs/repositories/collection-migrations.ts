import type { KyselyDB } from "../db/types.js";
import type DatabaseAdapter from "../db/adapter.js";
// import type { MigrationPlan } from "../../services/collection-migrator/migration/types.js";

export default class CollectionMigrationsRepo {
	constructor(
		private db: KyselyDB,
		private dbAdapter: DatabaseAdapter,
	) {}

	// ----------------------------------------
	// create
	// TODO: need to handle JSON columns in a way that supports all adapters
	createMultiple = async (props: {
		items: Array<{
			collectionKey: string;
			migrationPlans: string; // MigrationPlan
		}>;
	}) => {
		return this.db
			.insertInto("lucid_collection_migrations")
			.values(
				props.items.map((i) => ({
					collection_key: i.collectionKey,
					migration_plans: i.migrationPlans,
				})),
			)
			.execute();
	};
}
