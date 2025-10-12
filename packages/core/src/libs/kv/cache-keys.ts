const cacheKeys = {
	/**
	 * Generate a cache key for API key authentication
	 */
	auth: {
		client: (apiKey: string) => `auth:client:${apiKey}`,
	},
	/**
	 * Generate cache keys for HTTP responses (used by cache middleware)
	 */
	http: {
		response: (hash: string) => `http:${hash}`,
		group: (group: string) => `_http_cache_group:${group}`,
	},
} as const;

export default cacheKeys;
