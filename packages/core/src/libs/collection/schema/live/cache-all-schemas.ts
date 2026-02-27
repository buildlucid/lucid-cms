import type { ServiceFn } from "../../../../utils/services/types.js";
import migrateCollections from "../../migrate-collections.js";
import { resolveCachedMigrationResult } from "../../migration/cache.js";
import { hasSchema, setSchema } from "./cache.js";
import filterSchemaByMigrationPlan from "./filter-schema-by-migration-plan.js";

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
	const keyCacheStatus = await Promise.all(
		keys.map(async (key) => {
			return (await hasSchema(context, key)) ? null : key;
		}),
	);
	const nonCachedKeys = keyCacheStatus.filter((key) => key !== null);

	if (nonCachedKeys.length === 0) {
		return {
			data: undefined,
			error: undefined,
		};
	}

	const migrationResultRes = await resolveCachedMigrationResult(
		context,
		async () => {
			return await migrateCollections(context, { dryRun: true });
		},
	);
	if (migrationResultRes.error) return migrationResultRes;

	await Promise.all(
		nonCachedKeys.map(async (collectionKey) => {
			const collectionPlan = migrationResultRes.data.migrationPlans.find(
				(plan) => plan.collectionKey === collectionKey,
			);
			const liveSchema = migrationResultRes.data.inferedSchemas.find(
				(schema) => schema.key === collectionKey,
			);

			if (!liveSchema) return;

			let finalSchema = liveSchema;
			if (collectionPlan && collectionPlan.tables.length > 0) {
				finalSchema = filterSchemaByMigrationPlan(liveSchema, collectionPlan);
			}

			await setSchema(context, collectionKey, finalSchema);
		}),
	);

	return {
		data: undefined,
		error: undefined,
	};
};

export default cacheAllSchemas;
