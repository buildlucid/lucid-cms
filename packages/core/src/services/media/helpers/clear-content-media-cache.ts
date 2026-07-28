import cacheKeys from "../../../libs/kv/cache-keys.js";
import type { ServiceContext } from "../../../utils/services/types.js";

/**
 * Deletes every tenant variant of the cached content media single response.
 * Responses are cached per tenant so a single exact-key delete is not enough when multi-tenancy is enabled.
 */
const clearContentMediaSingleCache = (
	context: ServiceContext,
	id: string | number,
) =>
	Promise.all(
		[null, ...context.config.tenants.map((tenant) => tenant.key)].map(
			(tenantKey) =>
				context.kv.delete(context, {
					key: cacheKeys.http.static.contentMediaSingle(id, tenantKey),
					hash: true,
				}),
		),
	);

export default clearContentMediaSingleCache;
