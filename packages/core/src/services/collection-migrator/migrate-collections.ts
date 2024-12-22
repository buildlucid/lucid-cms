import Repository from "../../libs/repositories/index.js";
import inferSchema from "./schema/infer-schema.js";
import generateMigrationPlan from "./migration/generate-migration-plan.js";
import type { ServiceFn } from "../../types.js";
import type { CollectionSchema } from "./schema/types.js";
import { inspect } from "node:util";

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

	// console.log(
	// 	inspect(latestSchemas[0]?.schema.tables[1], {
	// 		depth: Number.POSITIVE_INFINITY,
	// 		colors: true,
	// 		numericSeparator: true,
	// 	}),
	// );

	//* infer schema for each collection
	const inferedSchemas: Array<{
		schema: CollectionSchema;
		checksum: string;
	}> = [];
	for (const [_, collection] of context.config.collections.entries()) {
		if (collection.key !== "page") continue;

		const res = inferSchema(collection, context.config.db);
		if (res.error) return res;
		inferedSchemas.push(res.data);
	}

	// console.log(
	// 	inspect(inferedSchemas[0], {
	// 		depth: Number.POSITIVE_INFINITY,
	// 		colors: true,
	// 		numericSeparator: true,
	// 	}),
	// );

	//* generate migration plan
	const migrationPlans = inferedSchemas.map((proposed) => {
		const existing = latestSchemas.find(
			(s) => s.collection_key === proposed.schema.key,
		);

		// console.log("existing", existing?.schema.tables[1]);
		// console.log("proposed", proposed.schema.tables[1]);

		return generateMigrationPlan({
			schemas: {
				existing: existing?.schema || null,
				current: proposed.schema,
			},
			checksums: {
				existing: existing?.checksum || null,
				current: proposed.checksum,
			},
		});
	});

	console.log(
		inspect(migrationPlans[0]?.data?.tables, {
			depth: Number.POSITIVE_INFINITY,
			colors: true,
			numericSeparator: true,
		}),
	);

	// console.log(latestSchemas[0]?.schema);

	return {
		data: undefined,
		error: undefined,
	};
};

export default migrateCollections;
