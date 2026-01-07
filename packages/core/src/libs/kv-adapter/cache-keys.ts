const HTTP_STATIC_PREFIX = "http:static:";

const cacheKeys = {
	/**
	 * Generate cache keys for rate limiting (used by rate limiter middleware)
	 */
	rateLimit: {
		ip: (ip: string) => `rate-limit:ip:${ip}`,
		user: (userId: string | number) => `rate-limit:user:${userId}`,
		client: (clientId: string | number) => `rate-limit:client:${clientId}`,
		record: (key: string) => `rate-limit:record:${key}`,
	},
	/**
	 * Generate a cache key for API key authentication
	 */
	auth: {
		client: (apiKey: string) => `auth:client:${apiKey}`,
		/**
		 * Cache key for refresh token existence
		 */
		refresh: (token: string) => `auth:refresh:${token}`,
	},
	/**
	 * Generate cache keys for HTTP responses (used by cache middleware)
	 */
	http: {
		response: (hash: string) => `http:${hash}`,
		tag: (tag: string) => `_http_cache_tag:${tag}`,
		tags: {
			clientLocales: "client-locales",
			clientMedia: "client-media",
		},
		static: {
			clientLocales: `${HTTP_STATIC_PREFIX}client-locales`,
			clientMediaSingle: (id: string | number) =>
				`${HTTP_STATIC_PREFIX}client-media:${id}` as `${typeof HTTP_STATIC_PREFIX}client-media:${string}`,
		},
	},
} as const;

type HttpStaticValue<T> = T extends (...args: infer _A) => infer R ? R : T;

export type HttpStaticValues = {
	[K in keyof typeof cacheKeys.http.static]: HttpStaticValue<
		(typeof cacheKeys.http.static)[K]
	>;
}[keyof typeof cacheKeys.http.static];

export default cacheKeys;
