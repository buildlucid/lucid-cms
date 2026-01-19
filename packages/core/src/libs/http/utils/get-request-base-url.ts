import type { LucidHonoContext } from "../../../types/hono.js";

/**
 * Returns the base URL for the Lucid instance from a Hono context.
 * If config.baseUrl is set, it will be used.
 * Otherwise, the origin is extracted from the request URL.
 */
const getRequestBaseUrl = (c: LucidHonoContext): string => {
	const config = c.get("config");
	if (config.baseUrl) {
		return config.baseUrl;
	}

	const url = new URL(c.req.url);
	return url.origin;
};

export default getRequestBaseUrl;
