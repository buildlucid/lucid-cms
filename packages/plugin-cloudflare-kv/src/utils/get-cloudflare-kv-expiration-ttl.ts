import type { KVSetOptions } from "@lucidcms/core/types";

const CLOUDFLARE_KV_MIN_TTL_SECONDS = 60;
const MILLISECONDS_PER_SECOND = 1000;

/**
 * Cloudflare KV only accepts expiration TTL values of at least 60 seconds.
 */
const getCloudflareKVExpirationTtl = (kvOptions?: KVSetOptions) => {
	let expirationTtl: number | undefined;

	if (kvOptions?.expirationTtl) {
		expirationTtl = Math.max(
			CLOUDFLARE_KV_MIN_TTL_SECONDS,
			kvOptions.expirationTtl,
		);
	} else if (kvOptions?.expirationTimestamp) {
		const nowSeconds = Math.floor(Date.now() / MILLISECONDS_PER_SECOND);
		expirationTtl = Math.max(
			CLOUDFLARE_KV_MIN_TTL_SECONDS,
			kvOptions.expirationTimestamp - nowSeconds,
		);
	}

	return expirationTtl;
};

export default getCloudflareKVExpirationTtl;
