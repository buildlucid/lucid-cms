import Repository from "../../libs/repositories/index.js";
import inferSchema from "./schema/infer-schema.js";
import generateMigrationPlan from "./migration/generate-migration-plan.js";
import buildMigrations from "./migration/build-migrations.js";
import logger from "../../utils/logging/index.js";
import type { ServiceFn } from "../../types.js";
import type { CollectionSchema } from "./schema/types.js";
import type { MigrationPlan } from "./migration/types.js";

/**
 * Infers collection schemas, works out the difference between the current collection schema and then migrates collections tables and data
 * - lucid_collection_{key}
 * - lucid_collection_{key}_versions
 * - lucid_collection_{key}_fields
 * - lucid_collection_{key}_{brick-key} * all potential bricks
 * - lucid_collection_{key}_{brick-key}_{repeater-field-key} * for each repeater for a single brick
 */
const migrateCollections: ServiceFn<[], undefined> = async (context) => {
	/*
        - Infer the schema for each collection and generate a checksum
        - Compare against the latest schema in the database and generate a migration plan
            - If no schema exists in the DB, it should be a full migration of the collection
            - If a schema exists, it should be a partial migration of the collection
            - If the schema checksum is the same, no migration is required
        - Save the new schema to the database
        - Execute the migration plan
    */

	const SchemaRepo = Repository.get("collection-schema", context.db);
	const latestSchemas = await SchemaRepo.selectLatest({
		select: ["collection_key", "schema", "checksum"],
	});

	//* infer schema for each collection
	const inferedSchemas: Array<{
		schema: CollectionSchema;
		checksum: string;
	}> = [];
	for (const [_, collection] of context.config.collections.entries()) {
		const res = inferSchema(collection, context.config.db);
		if (res.error) return res;
		inferedSchemas.push(res.data);
	}

	//* generate migration plan
	const migrationPlans: MigrationPlan[] = [];
	for (const i of inferedSchemas) {
		const existing = latestSchemas.find(
			(s) => s.collection_key === i.schema.key,
		);

		const migraitonPlanRes = generateMigrationPlan({
			schemas: {
				existing: existing?.schema || null,
				current: i.schema,
			},
			checksums: {
				existing: existing?.checksum || null,
				current: i.checksum,
			},
		});
		if (migraitonPlanRes.error) return migraitonPlanRes;

		migrationPlans.push(migraitonPlanRes.data);
	}

	//* inactive collections
	const inactiveCollections = latestSchemas.filter(
		(s) =>
			context.config.collections.findIndex(
				(c) => c.key === s.collection_key,
			) === -1,
	);
	if (inactiveCollections.length > 0) {
		// TODO: save this to the DB. Down the line we can use this to track how long a collection has been inactive and potentially delete it after a grace period.
		logger("debug", {
			message: `Found ${inactiveCollections.length} inactive collections: ${inactiveCollections.map((c) => c.collection_key).join(", ")}.`,
		});
	}

	//* build and run migrations
	await buildMigrations(context, {
		migrationPlan: migrationPlans,
	});

	//* save migration and inferedSchema to the DB

	return {
		data: undefined,
		error: undefined,
	};
};

export default migrateCollections;
