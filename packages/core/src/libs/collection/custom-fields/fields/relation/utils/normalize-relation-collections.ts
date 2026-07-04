/**
 * Normalizes the public relation collection config into the internal array
 * shape used by validation, refs and schema helpers.
 */
export const normalizeRelationCollections = (
	collection: string | string[],
): string[] => {
	if (Array.isArray(collection)) return collection;
	return [collection];
};
