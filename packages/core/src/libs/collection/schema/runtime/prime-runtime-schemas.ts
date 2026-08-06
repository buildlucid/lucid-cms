import type { ServiceFn } from "../../../../utils/services/types.js";
import { copy } from "../../../i18n/index.js";
import { CollectionMigrationsRepository } from "../../../repositories/index.js";
import collections from "../../collections.js";
import inferSchema from "../infer-schema.js";
import buildRuntimeSchema from "./build-runtime-schema.js";
import diffSnapshotVsConfig from "./diff-snapshot-vs-config.js";
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
	const CollectionMigrations = new CollectionMigrationsRepository(context.db);

	let keys = data.collectionKeys;
	if (keys === undefined) {
		const collectionsRes = await collections.getAll(context, {});
		if (collectionsRes.error) return collectionsRes;
		keys = collectionsRes.data.map((collection) => collection.key);
	}

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
		const collectionRes = await collections.getSingle(context, {
			key: collectionKey,
		});
		if (collectionRes.error) return collectionRes;

		const localSchemaRes = inferSchema(collectionRes.data, context.config.db);
		if (localSchemaRes.error) return localSchemaRes;

		const latestMigration = latestMigrationsByCollection.get(collectionKey);
		if (!latestMigration) {
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
					message: copy("server:core.errors.unknown", {
						defaultMessage:
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
