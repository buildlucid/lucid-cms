const HTTP_STATIC_PREFIX = "http:static:";

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
		tag: (tag: string) => `_http_cache_tag:${tag}`,
		tags: {
			clientLocales: "client-locales",
		},
		static: {
			clientLocales: `${HTTP_STATIC_PREFIX}client-locales`,
		} as const,
	},
} as const;

export type HttpStaticValues =
	(typeof cacheKeys.http.static)[keyof typeof cacheKeys.http.static];

export default cacheKeys;
