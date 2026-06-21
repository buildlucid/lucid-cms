import cacheKeys from "../../../libs/kv/cache-keys.js";
import type { ServiceContext } from "../../../utils/services/types.js";

/**
 * Deletes every tenant variant of the cached client media single response.
 * Responses are cached per tenant so a single exact-key delete is not enough when multi-tenancy is enabled.
 */
const clearClientMediaSingleCache = (
	context: ServiceContext,
	id: string | number,
) =>
	Promise.all(
		[null, ...context.config.tenants.map((tenant) => tenant.key)].map(
			(tenantKey) =>
				context.kv.delete(
					context,
					cacheKeys.http.static.clientMediaSingle(id, tenantKey),
					{
						hash: true,
					},
				),
		),
	);

export default clearClientMediaSingleCache;
