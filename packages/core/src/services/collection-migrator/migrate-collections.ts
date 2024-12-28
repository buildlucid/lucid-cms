import inferSchema from "./schema/infer-schema.js";
import generateMigrationPlan from "./migration/generate-migration-plan.js";
import buildMigrations from "./migration/build-migrations.js";
import buildTableName from "./helpers/build-table-name.js";
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
 * @todo Test the plan gen and buildMigrations for modify table/columns - not sure its working atm
 * @todo Update the inactive collection check to work with new db inferSchema data
 * @todo Save the migrations plans to the db
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
	// const inactiveCollections = latestSchemas.filter(
	// 	(s) =>
	// 		context.config.collections.findIndex(
	// 			(c) => c.key === s.collection_key,
	// 		) === -1,
	// );
	// if (inactiveCollections.length > 0) {
	// 	// TODO: save this to the DB. Down the line we can use this to track how long a collection has been inactive and potentially delete it after a grace period.
	// 	logger("debug", {
	// 		message: `Found ${inactiveCollections.length} inactive collections: ${inactiveCollections.map((c) => c.collection_key).join(", ")}.`,
	// 		scope: constants.logScopes.migrations,
	// 	});
	// }

	//* build and run migrations
	const migrationRes = await buildMigrations(context, {
		migrationPlan: migrationPlans,
	});
	if (migrationRes.error) return migrationRes;

	//* save migration and inferedSchema to the DB

	return {
		data: undefined,
		error: undefined,
	};
};

export default migrateCollections;
