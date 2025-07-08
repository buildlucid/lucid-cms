import type { CollectionSchema } from "../types.js";

// TODO: replace with KV solution

export const schemaCache = new Map<string, CollectionSchema>();

export const getSchema = (
	collectionKey: string,
): CollectionSchema | undefined => {
	return schemaCache.get(collectionKey);
};

export const setSchema = (
	collectionKey: string,
	schema: CollectionSchema,
): void => {
	schemaCache.set(collectionKey, schema);
};

export const clearSchema = (collectionKey: string): void => {
	schemaCache.delete(collectionKey);
};
