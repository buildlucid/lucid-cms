import type { CollectionSchema } from "../../../services/collection-migrator/schema/types.js";

const dbSchemaCache = new Map<string, CollectionSchema>();

export const getSchema = (
	collectionKey: string,
): CollectionSchema | undefined => {
	return dbSchemaCache.get(collectionKey);
};

export const setSchema = (
	collectionKey: string,
	schema: CollectionSchema,
	type: "runtime" | "db",
): void => {
	dbSchemaCache.set(collectionKey, schema);
};

export const clearSchema = (collectionKey: string): void => {
	dbSchemaCache.delete(collectionKey);
};
