import type { LucidErrorData } from "../../../../types/errors.js";
import type { ServiceContext } from "../../../../utils/services/types.js";
import cacheKeys from "../../../kv/cache-keys.js";
import collections from "../../collections.js";
import type { CollectionSchema } from "../types.js";
import { getCollectionSignature } from "./cache-signature.js";

type CachedSchemaResponse =
	| {
			data: CollectionSchema;
			error: undefined;
	  }
	| {
			data: undefined;
			error: LucidErrorData;
	  };

const schemaCache = new Map<string, CollectionSchema>();
const inFlightSchemaLoads = new Map<string, Promise<CachedSchemaResponse>>();

const getSchemaKey = (collectionKey: string, signature: string) =>
	`${cacheKeys.collection.schema(collectionKey)}:${signature}`;

const getCollectionSignatureByKey = async (
	context: ServiceContext,
	collectionKey: string,
): Promise<string | undefined> => {
	const collectionRes = await collections.getSingle(context, {
		key: collectionKey,
	});
	if (collectionRes.error) return undefined;

	return getCollectionSignature(collectionRes.data);
};

/**
 * Gets a runtime schema from memory/KV cache using the current collection
 * config signature.
 */
export const getRuntimeSchemaFromCache = async (
	context: ServiceContext,
	collectionKey: string,
): Promise<CollectionSchema | undefined> => {
	const signature = await getCollectionSignatureByKey(context, collectionKey);
	if (!signature) return undefined;

	const cacheKey = getSchemaKey(collectionKey, signature);

	const memoryCached = schemaCache.get(cacheKey);
	if (memoryCached) return memoryCached;

	const kvCached = await context.kv.get<CollectionSchema>(context, {
		key: cacheKey,
	});
	if (!kvCached) return undefined;

	schemaCache.set(cacheKey, kvCached);
	return kvCached;
};

export const hasRuntimeSchema = async (
	context: ServiceContext,
	collectionKey: string,
): Promise<boolean> => {
	return (
		(await getRuntimeSchemaFromCache(context, collectionKey)) !== undefined
	);
};

export const setRuntimeSchema = async (
	context: ServiceContext,
	collectionKey: string,
	schema: CollectionSchema,
): Promise<void> => {
	const signature = await getCollectionSignatureByKey(context, collectionKey);
	if (!signature) return;

	const cacheKey = getSchemaKey(collectionKey, signature);

	schemaCache.set(cacheKey, schema);
	await context.kv.set(context, {
		key: cacheKey,
		value: schema,
	});
};

export const resolveRuntimeSchema = async (
	context: ServiceContext,
	collectionKey: string,
	resolver: () => Promise<CachedSchemaResponse>,
): Promise<CachedSchemaResponse> => {
	const signature = await getCollectionSignatureByKey(context, collectionKey);
	if (!signature) {
		return await resolver();
	}

	const cacheKey = getSchemaKey(collectionKey, signature);
	const cachedSchema = await getRuntimeSchemaFromCache(context, collectionKey);
	if (cachedSchema) {
		return {
			data: cachedSchema,
			error: undefined,
		};
	}

	const inFlightSchema = inFlightSchemaLoads.get(cacheKey);
	if (inFlightSchema) return inFlightSchema;

	const pending = (async (): Promise<CachedSchemaResponse> => {
		try {
			const result = await resolver();
			if (!result.error) {
				await setRuntimeSchema(context, collectionKey, result.data);
			}
			return result;
		} finally {
			inFlightSchemaLoads.delete(cacheKey);
		}
	})();

	inFlightSchemaLoads.set(cacheKey, pending);

	return pending;
};
