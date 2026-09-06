import cacheKeys from "../../../libs/kv/cache-keys.js";
import { invalidateHttpCacheTag } from "../../../libs/kv/http-cache.js";
import type { ServiceContext } from "../../../utils/services/types.js";

const clearContentMediaSingleCache = (
	context: ServiceContext,
	id: string | number,
) =>
	invalidateHttpCacheTag(context, cacheKeys.http.tags.contentMediaSingle(id));

export default clearContentMediaSingleCache;
