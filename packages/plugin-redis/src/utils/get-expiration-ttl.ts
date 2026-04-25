import type { KVIncrementOptions, KVSetOptions } from "@lucidcms/core/types";

/**
 * Converts Lucid's expiration options to the relative TTL shape Redis commands
 * need for SETEX and EXPIRE.
 */
const getRedisExpirationTtl = (
	kvOptions?: KVSetOptions | KVIncrementOptions,
) => {
	if (kvOptions?.expirationTtl) {
		return kvOptions.expirationTtl;
	}

	if (kvOptions?.expirationTimestamp) {
		const nowSeconds = Math.floor(Date.now() / 1000);
		return Math.max(1, kvOptions.expirationTimestamp - nowSeconds);
	}

	return undefined;
};

export default getRedisExpirationTtl;
