import cacheKeys from "../../../libs/kv/cache-keys.js";
import type { KVAdapterInstance } from "../../../libs/kv/types.js";
import type { Config } from "../../../types/config.js";

/**
 * Deletes every tenant variant of the cached client media single response.
 * Responses are cached per tenant so a single exact-key delete is not enough when multi-tenancy is enabled.
 */
const clearClientMediaSingleCache = (
	kv: KVAdapterInstance,
	config: Config,
	id: string | number,
) =>
	Promise.all(
		[null, ...config.tenants.map((tenant) => tenant.key)].map((tenantKey) =>
			kv.delete(cacheKeys.http.static.clientMediaSingle(id, tenantKey), {
				hash: true,
			}),
		),
	);

export default clearClientMediaSingleCache;
