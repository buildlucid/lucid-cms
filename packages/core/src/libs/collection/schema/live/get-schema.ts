import type { ServiceFn } from "../../../../utils/services/types.js";
import migrateCollections from "../../migrate-collections.js";
import { resolveCachedMigrationResult } from "../../migration/cache.js";
import type { CollectionSchema } from "../types.js";
import { resolveSchema } from "./cache.js";
import filterSchemaByMigrationPlan from "./filter-schema-by-migration-plan.js";

const getSchema: ServiceFn<
	[
		{
			collectionKey: string;
		},
	],
	CollectionSchema
> = async (context, data) => {
	return await resolveSchema(context, data.collectionKey, async () => {
		const migrationResultRes = await resolveCachedMigrationResult(
			context,
			async () => {
				return await migrateCollections(context, { dryRun: true });
			},
		);
		if (migrationResultRes.error) return migrationResultRes;

		const collectionPlan = migrationResultRes.data.migrationPlans.find(
			(plan) => plan.collectionKey === data.collectionKey,
		);

		const liveSchema = migrationResultRes.data.inferedSchemas.find(
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

		return {
			data: filteredSchema,
			error: undefined,
		};
	});
};

export default getSchema;
