import type { LucidErrorData } from "../../../../types/errors.js";
import type { ServiceContext } from "../../../../utils/services/types.js";
import cacheKeys from "../../../kv-adapter/cache-keys.js";
import type { CollectionSchema } from "../types.js";

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

const getSchemaKey = (collectionKey: string) =>
	cacheKeys.collection.schema(collectionKey);

export const getSchema = async (
	context: ServiceContext,
	collectionKey: string,
): Promise<CollectionSchema | undefined> => {
	const memoryCached = schemaCache.get(collectionKey);
	if (memoryCached) return memoryCached;

	const kvCached = await context.kv.get<CollectionSchema>(
		getSchemaKey(collectionKey),
	);
	if (!kvCached) return undefined;

	schemaCache.set(collectionKey, kvCached);
	return kvCached;
};

export const hasSchema = async (
	context: ServiceContext,
	collectionKey: string,
): Promise<boolean> => {
	return (await getSchema(context, collectionKey)) !== undefined;
};

export const setSchema = async (
	context: ServiceContext,
	collectionKey: string,
	schema: CollectionSchema,
): Promise<void> => {
	schemaCache.set(collectionKey, schema);
	await context.kv.set(getSchemaKey(collectionKey), schema);
};

export const resolveSchema = async (
	context: ServiceContext,
	collectionKey: string,
	resolver: () => Promise<CachedSchemaResponse>,
): Promise<CachedSchemaResponse> => {
	const cachedSchema = await getSchema(context, collectionKey);
	if (cachedSchema) {
		return {
			data: cachedSchema,
			error: undefined,
		};
	}

	const inFlightSchema = inFlightSchemaLoads.get(collectionKey);
	if (inFlightSchema) return inFlightSchema;

	const pending = (async (): Promise<CachedSchemaResponse> => {
		try {
			const result = await resolver();
			if (!result.error) {
				await setSchema(context, collectionKey, result.data);
			}
			return result;
		} finally {
			inFlightSchemaLoads.delete(collectionKey);
		}
	})();

	inFlightSchemaLoads.set(collectionKey, pending);

	return pending;
};
