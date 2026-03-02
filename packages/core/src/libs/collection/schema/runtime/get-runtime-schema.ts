import T from "../../../../translations/index.js";
import type { ServiceFn } from "../../../../utils/services/types.js";
import { CollectionMigrationsRepository } from "../../../repositories/index.js";
import inferSchema from "../infer-schema.js";
import type { CollectionSchema } from "../types.js";
import buildRuntimeSchema from "./build-runtime-schema.js";
import diffSnapshotVsConfigAdditions from "./diff-snapshot-vs-config-additions.js";
import { resolveRuntimeSchema } from "./runtime-schema-cache.js";

/**
 * Builds the runtime schema for a collection by comparing the latest persisted
 * migration snapshot to the current config-inferred schema.
 */
const getRuntimeSchema: ServiceFn<
	[
		{
			collectionKey: string;
		},
	],
	CollectionSchema
> = async (context, data) => {
	const CollectionMigrations = new CollectionMigrationsRepository(
		context.db.client,
		context.config.db,
	);

	return await resolveRuntimeSchema(context, data.collectionKey, async () => {
		const collection = context.config.collections.find(
			(c) => c.key === data.collectionKey,
		);
		if (!collection) {
			return {
				data: undefined,
				error: {
					message: T("collection_not_found_message"),
				},
			};
		}

		const localSchemaRes = inferSchema(collection, context.config.db);
		if (localSchemaRes.error) return localSchemaRes;
		const latestMigrationRes =
			await CollectionMigrations.selectLatestByCollectionKey({
				collectionKey: data.collectionKey,
			});
		if (latestMigrationRes.error) return latestMigrationRes;
		if (!latestMigrationRes.data) {
			return {
				data: undefined,
				error: {
					type: "basic",
					name: T("error_schema_migration_required_name"),
					message: T("error_schema_migration_required_message"),
					status: 400,
				},
			};
		}

		const diff = diffSnapshotVsConfigAdditions(
			latestMigrationRes.data.collection_schema,
			localSchemaRes.data,
		);

		//* remove additions not yet present in the persisted migration snapshot
		const filteredSchema = buildRuntimeSchema(localSchemaRes.data, diff);

		return {
			data: filteredSchema,
			error: undefined,
		};
	});
};

export default getRuntimeSchema;
