import type { ServiceFn } from "../../types.js";
import serviceWrapper from "../../utils/services/service-wrapper.js";
import { CollectionMigrationsRepository } from "../repositories/index.js";
import buildMigrations from "./migration/build-migrations.js";
import type {
	CollectionMigrationPlan,
	MigrationPlan,
} from "./migration/types.js";
import type { CollectionSchema } from "./schema/types.js";

type CollectionMigrationBatch = {
	migrationPlan: MigrationPlan;
	migrationEntry: {
		collection_key: string;
		table_name_map: string;
		migration_plans: MigrationPlan;
		collection_schema: CollectionSchema;
	};
};

/**
 * Applies one collection's planned table operations and persists its resulting
 * schema snapshot atomically when the configured database supports transactions.
 */
const applyCollectionMigrationBatch = serviceWrapper<
	[CollectionMigrationBatch],
	undefined
>(
	async (context, data) => {
		const migrationRes = await buildMigrations(context, {
			migrationPlan: [data.migrationPlan],
		});
		if (migrationRes.error) return migrationRes;

		const CollectionMigrations = new CollectionMigrationsRepository(
			context.db.client,
			context.config.db,
		);
		const migrationEntryRes = await CollectionMigrations.createSingle({
			data: data.migrationEntry,
		});
		if (migrationEntryRes.error) return migrationEntryRes;

		return { data: undefined, error: undefined };
	},
	{ transaction: true },
);

/**
 * Applies a collection migration plan exactly as provided and records
 * the inferred collection schemas that the plan brings into effect.
 */
const applyCollectionMigrations: ServiceFn<
	[CollectionMigrationPlan],
	undefined
> = async (context, plan) => {
	const batches = plan.collections.map(({ inferredSchema, migrationPlan }) => {
		const tableNameMap = Object.fromEntries(
			inferredSchema.tables.map((table) => [
				table.name,
				table.rawName ?? table.name,
			]),
		);

		return {
			migrationPlan,
			migrationEntry: {
				collection_key: inferredSchema.key,
				table_name_map: JSON.stringify(tableNameMap),
				migration_plans: migrationPlan,
				collection_schema: inferredSchema,
			},
		} satisfies CollectionMigrationBatch;
	});

	for (const batch of batches) {
		const migrationRes = await applyCollectionMigrationBatch(context, batch);
		if (migrationRes.error) return migrationRes;
	}

	return { data: undefined, error: undefined };
};

export default applyCollectionMigrations;
