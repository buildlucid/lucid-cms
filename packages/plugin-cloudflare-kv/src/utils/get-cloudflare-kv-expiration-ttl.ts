const CLOUDFLARE_KV_MIN_TTL_SECONDS = 60;
const MILLISECONDS_PER_SECOND = 1000;

type ExpirationOptions = {
	ttlSeconds?: number;
	expiresAtSeconds?: number;
};

/**
 * Cloudflare KV only accepts expiration TTL values of at least 60 seconds.
 */
const getCloudflareKVExpirationTtl = (kvOptions?: ExpirationOptions) => {
	let ttlSeconds: number | undefined;

	if (kvOptions?.ttlSeconds) {
		ttlSeconds = Math.max(CLOUDFLARE_KV_MIN_TTL_SECONDS, kvOptions.ttlSeconds);
	} else if (kvOptions?.expiresAtSeconds) {
		const nowSeconds = Math.floor(Date.now() / MILLISECONDS_PER_SECOND);
		ttlSeconds = Math.max(
			CLOUDFLARE_KV_MIN_TTL_SECONDS,
			kvOptions.expiresAtSeconds - nowSeconds,
		);
	}

	return ttlSeconds;
};

export default getCloudflareKVExpirationTtl;
