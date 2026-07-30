import type { ServiceFn } from "../../../../utils/services/types.js";
import { copy } from "../../../i18n/index.js";
import { CollectionMigrationsRepository } from "../../../repositories/index.js";
import collections from "../../collections.js";
import inferSchema from "../infer-schema.js";
import type { CollectionSchema } from "../types.js";
import buildRuntimeSchema from "./build-runtime-schema.js";
import diffSnapshotVsConfig from "./diff-snapshot-vs-config.js";
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
		const collectionRes = await collections.getSingle(context, {
			key: data.collectionKey,
		});
		if (collectionRes.error) return collectionRes;

		const localSchemaRes = inferSchema(collectionRes.data, context.config.db);
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
					name: copy("server:core.error.schema.migration.required.name"),
					message: copy("server:core.error.schema.migration.required.message"),
					status: 400,
				},
			};
		}

		const diff = diffSnapshotVsConfig(
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
