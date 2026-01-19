import type { ServiceContext } from "../services/types.js";

/**
 * Returns the base URL for the Lucid instance.
 * If config.baseUrl is set, it will be used.
 * Otherwise, the origin is extracted from the request URL.
 */
const getBaseUrl = (context: ServiceContext): string => {
	if (context.config.baseUrl) {
		return context.config.baseUrl;
	}

	const url = new URL(context.requestUrl);
	return url.origin;
};

export default getBaseUrl;
