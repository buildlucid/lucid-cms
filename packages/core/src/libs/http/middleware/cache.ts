import { createMiddleware } from "hono/factory";
import type { LucidHonoContext } from "../../../types/hono.js";
import { hasher } from "node-object-hash";
import { addKeyToGroups } from "../../kv/http-cache.js";
import cacheKeys from "../../kv/cache-keys.js";

const hashInstance = hasher({ sort: true, coerce: true });

type CacheOptions = {
	/** The time-to-live (TTL) for the cached response in seconds. */
	ttl: number;
	/** The mode for generating the cache key. */
	mode: "path-only" | "include-query";
	/** The headers to include in the cache key. */
	includeHeaders?: string[];
	/** The groups to add the cache key to. */
	groups?: string[] | ((c: LucidHonoContext) => string[]);
};

/**
 * Generate a cache key based on the request context and options.
 */
const generateCacheKey = (c: LucidHonoContext, options: CacheOptions) => {
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

		const cached = await kv.get(cacheKey);
		if (cached !== null) {
			return c.json(cached);
		}

		await next();

		const response = c.res.clone();
		if (
			response.ok &&
			response.headers.get("content-type")?.includes("application/json")
		) {
			const data = await response.json();
			await kv.set(cacheKey, data, {
				expirationTtl: options.ttl,
			});

			if (options.groups) {
				const groups =
					typeof options.groups === "function"
						? options.groups(c)
						: options.groups;
				await addKeyToGroups(kv, groups, cacheKey);
			}
		}
	});

export default cache;
