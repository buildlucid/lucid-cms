import cacheKeys from "./cache-keys.js";

/** Store these tokens with cached output; a changed token invalidates that output. */
const contentCacheTags = {
	documents: cacheKeys.http.tags.contentDocuments,
	/** Rotates for changes to this collection or documents it references. */
	collection: cacheKeys.http.tags.contentDocumentsCollection,
	/** Rotates for changes to any media item. */
	media: cacheKeys.http.tags.contentMedia,
} as const;

export default contentCacheTags;
