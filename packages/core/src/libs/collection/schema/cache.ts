import type { CollectionSchema } from "../../../services/collection-migrator/schema/types.js";

const liveSchemaCache = new Map<string, CollectionSchema>();
const dbSchemaCache = new Map<string, CollectionSchema>();

export const getSchema = (
	collectionKey: string,
	type: "runtime" | "db",
): CollectionSchema | undefined => {
	if (type === "runtime") {
		return liveSchemaCache.get(collectionKey);
	}
	return dbSchemaCache.get(collectionKey);
};

export const setSchema = (
	collectionKey: string,
	schema: CollectionSchema,
	type: "runtime" | "db",
): void => {
	if (type === "runtime") {
		liveSchemaCache.set(collectionKey, schema);
	} else {
		dbSchemaCache.set(collectionKey, schema);
	}
};

export const clearSchema = (
	collectionKey: string,
	type: "runtime" | "db",
): void => {
	if (type === "runtime") {
		liveSchemaCache.delete(collectionKey);
	} else {
		dbSchemaCache.delete(collectionKey);
	}
};

export const clearAllSchemas = (): void => {
	liveSchemaCache.clear();
	dbSchemaCache.clear();
};
