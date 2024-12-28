import inferSchema from "./schema/infer-schema.js";
import generateMigrationPlan from "./migration/generate-migration-plan.js";
import buildMigrations from "./migration/build-migrations.js";
import buildTableName from "./helpers/build-table-name.js";
import getInactiveCollections from "./helpers/inactive-collections.js";
import type { ServiceFn } from "../../types.js";
import type { CollectionSchema } from "./schema/types.js";
import type { MigrationPlan } from "./migration/types.js";

/**
 * Infers collection schemas, works out the difference between the current collection schema and then migrates collections tables and data
 * - lucid_document__{key}
 * - lucid_document__{key}__versions
 * - lucid_document__{key}__fields
 * - lucid_document__{key}__{brick-key} * all potential bricks
 * - lucid_document__{key}__{brick-key}__{repeater-field-key} * for each repeater for a single brick
 * @todo Save the migrations plans to the db
 * @todo Save inactive collections to the DB along with a timestamp for when they were first marked as inactive. Create a job to tidy inactive collections after say 30 days
 */
const migrateCollections: ServiceFn<[], undefined> = async (context) => {
	const dbSchema = await context.config.db.inferSchema(context.db);

	//* infer schema for each collection
	const inferedSchemas: Array<CollectionSchema> = [];
	for (const [_, collection] of context.config.collections.entries()) {
		const res = inferSchema(collection, context.config.db);
		if (res.error) return res;
		inferedSchemas.push(res.data);
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

	//* inactive collections
	const inactiveCollections = getInactiveCollections({
		collections: context.config.collections,
		dbSchema: dbSchema,
	});

	//* build and run migrations
	const migrationRes = await buildMigrations(context, {
		migrationPlan: migrationPlans,
	});
	if (migrationRes.error) return migrationRes;

	//* save migration plans to db

	return {
		data: undefined,
		error: undefined,
	};
};

export default migrateCollections;
