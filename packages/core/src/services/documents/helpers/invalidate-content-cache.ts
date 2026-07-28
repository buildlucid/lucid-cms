import cacheKeys from "../../../libs/kv/cache-keys.js";
import { invalidateHttpCacheTags } from "../../../libs/kv/http-cache.js";
import type { ServiceContext } from "../../../utils/services/types.js";

/**
 * Invalidate cached content API document responses for a collection.
 */
const invalidateContentDocumentCache = async (
	context: ServiceContext,
	collectionKey: string,
) => {
	await invalidateHttpCacheTags(context, [
		cacheKeys.http.tags.contentDocuments,
		cacheKeys.http.tags.contentDocumentsCollection(collectionKey),
	]);
};

export default invalidateContentDocumentCache;
