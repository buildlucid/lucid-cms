import migrateCollections from "../../migrate-collections.js";
import {
	getCachedMigrationResult,
	setCachedMigrationResult,
} from "../../migration/cache.js";
import filterSchemaByMigrationPlan from "./filter-schema-by-migration-plan.js";
import { schemaCache, setSchema } from "./cache.js";
import type { ServiceFn } from "../../../../utils/services/types.js";

const cacheAllSchemas: ServiceFn<
	[
		{
			collectionKeys?: string[];
		},
	],
	undefined
> = async (context, data) => {
	const keys =
		data.collectionKeys ?? context.config.collections.map((c) => c.key);
	const nonCachedKeys = keys.filter((k) => !schemaCache.has(k));

	if (nonCachedKeys.length === 0) {
		return {
			data: undefined,
			error: undefined,
		};
	}

	let migrationResult = getCachedMigrationResult();
	if (!migrationResult) {
		const migrationRes = await migrateCollections(context, { dryRun: true });
		if (migrationRes.error) return migrationRes;

		migrationResult = migrationRes.data;
		setCachedMigrationResult(migrationResult);
	}

	for (const collectionKey of nonCachedKeys) {
		const collectionPlan = migrationResult.migrationPlans.find(
			(plan) => plan.collectionKey === collectionKey,
		);
		const liveSchema = migrationResult.inferedSchemas.find(
			(schema) => schema.key === collectionKey,
		);

		if (!liveSchema) continue;

		let finalSchema = liveSchema;
		if (collectionPlan && collectionPlan.tables.length > 0) {
			finalSchema = filterSchemaByMigrationPlan(liveSchema, collectionPlan);
		}

		setSchema(collectionKey, finalSchema);
	}

	return {
		data: undefined,
		error: undefined,
	};
};

export default cacheAllSchemas;
