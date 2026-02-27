import cacheKeys from "../../../libs/kv-adapter/cache-keys.js";
import { invalidateHttpCacheTags } from "../../../libs/kv-adapter/http-cache.js";
import type { ServiceContext } from "../../../utils/services/types.js";

/**
 * Invalidate cached client document responses for a collection.
 */
const invalidateClientDocumentCache = async (
	context: ServiceContext,
	collectionKey: string,
) => {
	await invalidateHttpCacheTags(context.kv, [
		cacheKeys.http.tags.clientDocuments,
		cacheKeys.http.tags.clientDocumentsCollection(collectionKey),
	]);
};

export default invalidateClientDocumentCache;
