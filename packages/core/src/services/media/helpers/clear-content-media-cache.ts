import cacheKeys from "../../../libs/kv/cache-keys.js";
import type { ServiceContext } from "../../../utils/services/types.js";

const clearContentMediaSingleCache = (
	context: ServiceContext,
	id: string | number,
) =>
	context.kv.delete(context, {
		key: cacheKeys.http.static.contentMediaSingle(id),
		hash: true,
	});

export default clearContentMediaSingleCache;
