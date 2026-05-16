/**
 * Normalizes the public document collection config into the internal array
 * shape used by validation, refs and schema helpers.
 */
export const normalizeDocumentCollections = (
	collection: string | string[],
): string[] => {
	if (Array.isArray(collection)) return collection;
	return [collection];
};
