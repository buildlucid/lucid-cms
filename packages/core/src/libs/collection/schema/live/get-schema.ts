import migrateCollections from "../../migrate-collections.js";
import {
	getSchema as getCachedSchema,
	setSchema as setCachedSchema,
} from "./cache.js";
import {
	getCachedMigrationResult,
	setCachedMigrationResult,
} from "../../migration/cache.js";
import filterSchemaByMigrationPlan from "./filter-schema-by-migration-plan.js";
import type { ServiceFn } from "../../../../utils/services/types.js";
import type { CollectionSchema } from "../types.js";

const getSchema: ServiceFn<
	[
		{
			collectionKey: string;
		},
	],
	CollectionSchema
> = async (context, data) => {
	const cachedSchema = getCachedSchema(data.collectionKey);
	if (cachedSchema) {
		return {
			data: cachedSchema,
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

	const collectionPlan = migrationResult.migrationPlans.find(
		(plan) => plan.collectionKey === data.collectionKey,
	);

	const liveSchema = migrationResult.inferedSchemas.find(
		(schema) => schema.key === data.collectionKey,
	);

	if (!liveSchema) {
		return {
			data: undefined,
			error: {
				message: `Collection schema not found for key: ${data.collectionKey}`,
			},
		};
	}

	if (!collectionPlan || collectionPlan.tables.length === 0) {
		setCachedSchema(data.collectionKey, liveSchema);
		return {
			data: liveSchema,
			error: undefined,
		};
	}

	//* filter out tables and columns that haven't been migrated yet
	const filteredSchema = filterSchemaByMigrationPlan(
		liveSchema,
		collectionPlan,
	);

	setCachedSchema(data.collectionKey, filteredSchema);

	return {
		data: filteredSchema,
		error: undefined,
	};
};

export default getSchema;
