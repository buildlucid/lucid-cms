import type { ServiceFn } from "../../types.js";
import generateMigrationPlan from "./migration/generate-migration-plan.js";
import type {
	CollectionMigrationPlan,
	PlannedCollectionMigration,
} from "./migration/types.js";
import inferSchema from "./schema/infer-schema.js";

/**
 * Introspects the database and builds the exact supported operations needed to
 * bring Lucid-owned tables in line with the configured collections.
 */
const planCollectionMigrations: ServiceFn<[], CollectionMigrationPlan> = async (
	context,
) => {
	const dbSchema = await context.config.db.inferSchema(context.db.client);
	const collections: PlannedCollectionMigration[] = [];

	for (const collection of context.config.collections) {
		const schemaRes = inferSchema(collection, context.config.db);
		if (schemaRes.error) return schemaRes;
		const configuredTableNames = new Set(
			schemaRes.data.tables.map((table) => table.name),
		);
		const existingTables = dbSchema.filter((table) =>
			configuredTableNames.has(table.name),
		);
		const migrationPlanRes = generateMigrationPlan({
			schemas: {
				existing: existingTables,
				current: schemaRes.data,
			},
			db: context.config.db,
		});
		if (migrationPlanRes.error) return migrationPlanRes;

		collections.push({
			migrationPlan: migrationPlanRes.data,
			inferredSchema: schemaRes.data,
		});
	}

	return {
		data: { collections },
		error: undefined,
	};
};

export default planCollectionMigrations;
