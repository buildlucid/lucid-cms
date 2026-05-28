import type { ServiceFn } from "../../../../utils/services/types.js";
import { serverText } from "../../../i18n/index.js";
import { CollectionMigrationsRepository } from "../../../repositories/index.js";
import inferSchema from "../infer-schema.js";
import buildRuntimeSchema from "./build-runtime-schema.js";
import diffSnapshotVsConfigAdditions from "./diff-snapshot-vs-config-additions.js";
import { hasRuntimeSchema, setRuntimeSchema } from "./runtime-schema-cache.js";

/**
 * Warms runtime schema cache entries for one or more collections.
 */
const primeRuntimeSchemas: ServiceFn<
	[
		{
			collectionKeys?: string[];
		},
	],
	undefined
> = async (context, data) => {
	const CollectionMigrations = new CollectionMigrationsRepository(
		context.db.client,
		context.config.db,
	);

	const keys =
		data.collectionKeys ?? context.config.collections.map((c) => c.key);
	const keyCacheStatus = await Promise.all(
		keys.map(async (key) => {
			return (await hasRuntimeSchema(context, key)) ? null : key;
		}),
	);
	const nonCachedKeys = keyCacheStatus.filter(
		(key): key is string => key !== null,
	);

	if (nonCachedKeys.length === 0) {
		return {
			data: undefined,
			error: undefined,
		};
	}

	const latestMigrationsRes =
		await CollectionMigrations.selectLatestByCollectionKeysMap({
			collectionKeys: nonCachedKeys,
			validation: {
				enabled: true,
			},
		});
	if (latestMigrationsRes.error) return latestMigrationsRes;

	const latestMigrationsByCollection = new Map(
		latestMigrationsRes.data.map((migration) => [
			migration.collection_key,
			migration,
		]),
	);

	for (const collectionKey of nonCachedKeys) {
		const collection = context.config.collections.find(
			(c) => c.key === collectionKey,
		);
		if (!collection) {
			return {
				data: undefined,
				error: {
					message: serverText("core.collections.not.found.message"),
				},
			};
		}

		const localSchemaRes = inferSchema(collection, context.config.db);
		if (localSchemaRes.error) return localSchemaRes;

		const latestMigration = latestMigrationsByCollection.get(collectionKey);
		if (!latestMigration) {
			return {
				data: undefined,
				error: {
					type: "basic",
					name: serverText("core.error.schema.migration.required.name"),
					message: serverText("core.error.schema.migration.required.message"),
					status: 400,
				},
			};
		}

		const diff = diffSnapshotVsConfigAdditions(
			latestMigration.collection_schema,
			localSchemaRes.data,
		);

		const finalSchema = buildRuntimeSchema(localSchemaRes.data, diff);

		try {
			await setRuntimeSchema(context, collectionKey, finalSchema);
		} catch (error) {
			return {
				data: undefined,
				error: {
					message: serverText("core.errors.unknown", {
						fallback:
							error instanceof Error
								? error.message
								: "An unknown error occurred",
					}),
				},
			};
		}
	}

	return {
		data: undefined,
		error: undefined,
	};
};

export default primeRuntimeSchemas;
