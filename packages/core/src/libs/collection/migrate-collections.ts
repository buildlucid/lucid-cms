import inferSchema from "../../libs/collection/schema/infer-schema.js";
import type { CollectionSchema } from "../../libs/collection/schema/types.js";
import { CollectionMigrationsRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../types.js";
import buildTableName from "./helpers/build-table-name.js";
import buildMigrations from "./migration/build-migrations.js";
import generateMigrationPlan from "./migration/generate-migration-plan.js";
import type { MigrationPlan } from "./migration/types.js";

/**
 * Infers collection schemas, works out the difference between the current collection schema and then migrates collections tables and data
 * - lucid_document__{key}
 * - lucid_document__{key}__versions
 * - lucid_document__{key}__fields
 * - lucid_document__{key}__{brick-key} * all potential bricks
 * - lucid_document__{key}__{brick-key}__{repeater-field-key} * for each repeater for a single brick
 */
const migrateCollections: ServiceFn<
	[
		{
			dryRun?: boolean;
		},
	],
	{
		migrationPlans: MigrationPlan[];
		inferedSchemas: CollectionSchema[];
	}
> = async (context, data) => {
	const CollectionMigrations = new CollectionMigrationsRepository(
		context.db,
		context.config.db,
	);
	const dbSchema = await context.config.db.inferSchema();

	//* infer schema for each collection
	const inferedSchemas: Array<CollectionSchema> = [];
	for (const [_, collection] of context.config.collections.entries()) {
		const schemaRes = inferSchema(collection, context.config.db);
		if (schemaRes.error) return schemaRes;
		inferedSchemas.push(schemaRes.data);
	}

	//* generate migration plan
	const migrationPlans: MigrationPlan[] = [];
	for (const i of inferedSchemas) {
		const tableNameRes = buildTableName("document", {
			collection: i.key,
		});
		if (tableNameRes.error) return tableNameRes;

		const existingTables = dbSchema.filter((t) =>
			t.name.startsWith(tableNameRes.data),
		);

		const migraitonPlanRes = generateMigrationPlan({
			schemas: {
				existing: existingTables,
				current: i,
			},
			db: context.config.db,
		});
		if (migraitonPlanRes.error) return migraitonPlanRes;

		migrationPlans.push(migraitonPlanRes.data);
	}

	if (data.dryRun) {
		return {
			data: {
				migrationPlans,
				inferedSchemas,
			},
			error: undefined,
		};
	}

	//* build and run migrations
	const migrationRes = await buildMigrations(context, {
		migrationPlan: migrationPlans,
	});
	if (migrationRes.error) return migrationRes;

	//* save migration plans to db
	const migrationPlanEntries = migrationPlans
		.map((mp) => {
			if (mp.tables.length === 0) return null;
			return {
				collection_key: mp.collectionKey,
				migration_plans: mp,
			};
		})
		.filter((mp) => mp !== null);

	if (migrationPlanEntries.length > 0) {
		const migrationsRes = await CollectionMigrations.createMultiple({
			data: migrationPlanEntries,
		});
		if (migrationsRes.error) return migrationsRes;
	}

	return {
		data: {
			migrationPlans,
			inferedSchemas,
		},
		error: undefined,
	};
};

export default migrateCollections;
