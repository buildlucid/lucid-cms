import type { LucidHonoContext } from "../../../types/hono.js";
import { normalizeHost } from "../../../utils/helpers/index.js";

/**
 * Returns the base URL for the Lucid instance from a Hono context.
 * If config.host is set, it will be used.
 * Otherwise, the origin is extracted from the request URL.
 */
const getRequestBaseUrl = (c: LucidHonoContext): string => {
	const config = c.get("config");
	if (config.host?.trim()) {
		return normalizeHost(config.host);
	}

	const url = new URL(c.req.url);
	return normalizeHost(url.origin);
};

export default getRequestBaseUrl;
