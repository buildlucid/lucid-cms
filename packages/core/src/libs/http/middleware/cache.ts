import { createMiddleware } from "hono/factory";
import { hasher } from "node-object-hash";
import type { LucidHonoContext } from "../../../types/hono.js";
import cacheKeys, { type HttpStaticValues } from "../../kv/cache-keys.js";
import { addKeyToTag } from "../../kv/http-cache.js";

const hashInstance = hasher({ sort: true, coerce: true });

type CacheOptions = {
	/** The time-to-live (TTL) for the cached response in seconds. */
	ttl: number;
	/** The mode for generating the cache key. */
	mode: "path-only" | "include-query" | "static";
	/** The headers to include in the cache key. */
	includeHeaders?: string[];
	/** The tags to add the cache key to. */
	tags?: string[] | ((c: LucidHonoContext) => string[]);
	/** Bypasses hash generation and uses a simple string key. Useful for endpoints with no variations. */
	staticKey?: HttpStaticValues;
};

/**
 * Generate a cache key based on the request context and options.
 */
const generateCacheKey = (c: LucidHonoContext, options: CacheOptions) => {
	if (options.staticKey) {
		return options.staticKey;
	}

	const { mode = "include-query", includeHeaders = [] } = options;

	const cacheObject: Record<string, unknown> = {
		path: c.req.path,
	};

	if (mode === "include-query") {
		const url = new URL(c.req.url);
		cacheObject.query = Object.fromEntries(url.searchParams.entries());
	}

	if (includeHeaders.length > 0) {
		cacheObject.headers = {};
		for (const headerName of includeHeaders) {
			const headerValue = c.req.header(headerName);
			if (headerValue) {
				// @ts-expect-error
				cacheObject.headers[headerName] = headerValue;
			}
		}
	}

	return cacheKeys.http.response(hashInstance.hash(cacheObject));
};

/**
 * Check if the request should bypass the cache.
 */
const shouldBypassCache = (c: LucidHonoContext): boolean => {
	const cacheControl = c.req.header("Cache-Control");
	const pragma = c.req.header("Pragma");

	if (
		cacheControl?.includes("no-cache") ||
		cacheControl?.includes("no-store")
	) {
		return true;
	}

	if (pragma === "no-cache") {
		return true;
	}

	return false;
};

/**
 * Middleware to cache responses based on the request context and options.
 */
const cache = (options: CacheOptions) =>
	createMiddleware(async (c: LucidHonoContext, next) => {
		if (shouldBypassCache(c)) {
			return await next();
		}

		const kv = c.get("kv");
		const cacheKey = generateCacheKey(c, options);

		const cached = await kv.get<{ data: unknown; cachedAt: number }>(cacheKey);
		if (cached !== null) {
			const age = Math.floor((Date.now() - cached.cachedAt) / 1000);
			c.header("X-Cache", "HIT");
			c.header("Age", age.toString());
			return c.json(cached.data);
		}

		await next();

		const response = c.res.clone();
		if (
			response.ok &&
			response.headers.get("content-type")?.includes("application/json")
		) {
			const data = await response.json();
			await kv.set(
				cacheKey,
				{
					data: data,
					cachedAt: Date.now(),
				},
				{
					expirationTtl: options.ttl,
				},
			);

			if (options.tags) {
				const tags =
					typeof options.tags === "function" ? options.tags(c) : options.tags;
				await addKeyToTag(kv, tags, cacheKey);
			}
		}

		c.header("X-Cache", "MISS");
	});

export default cache;
