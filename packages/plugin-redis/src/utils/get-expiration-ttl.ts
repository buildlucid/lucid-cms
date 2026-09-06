type ExpirationOptions = {
	ttlSeconds?: number;
	expiresAtSeconds?: number;
};

/**
 * Converts Lucid's expiration options to the relative TTL shape Redis commands
 * need for SETEX and EXPIRE.
 */
const getRedisExpirationTtl = (kvOptions?: ExpirationOptions) => {
	if (kvOptions?.ttlSeconds) {
		return kvOptions.ttlSeconds;
	}

	if (kvOptions?.expiresAtSeconds) {
		const nowSeconds = Math.floor(Date.now() / 1000);
		return Math.max(1, kvOptions.expiresAtSeconds - nowSeconds);
	}

	return undefined;
};

export default getRedisExpirationTtl;
