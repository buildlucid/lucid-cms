/**
 * Normalizes the public single-collection config into the internal array shape
 * used by validation, refs and schema helpers.
 */
export const normalizeDocumentCollections = (collection: string): string[] => {
	return [collection];
};
