import type { ServiceContext } from "../services/types.js";

const normalizeBaseUrl = (baseUrl: string) => {
	const trimmedBaseUrl = baseUrl.trim().replace(/\/+$/, "");

	if (/^https?:\/\//i.test(trimmedBaseUrl)) {
		return trimmedBaseUrl;
	}

	return `https://${trimmedBaseUrl}`;
};

/**
 * Returns the base URL for the Lucid instance.
 * If config.baseUrl is set, it will be used.
 * Otherwise, the origin is extracted from the request URL.
 */
const getBaseUrl = (context: ServiceContext): string => {
	if (context.config.baseUrl?.trim()) {
		return normalizeBaseUrl(context.config.baseUrl);
	}

	const url = new URL(context.request.url);
	return normalizeBaseUrl(url.origin);
};

export default getBaseUrl;
