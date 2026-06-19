import type { ServiceContext } from "../services/types.js";

export const normalizeHost = (host: string) => {
	const trimmedHost = host.trim().replace(/\/+$/, "");

	if (/^https?:\/\//i.test(trimmedHost)) {
		return trimmedHost;
	}

	return `https://${trimmedHost}`;
};

/**
 * Returns the base URL for the Lucid instance.
 * If config.host is set, it will be used.
 * Otherwise, the origin is extracted from the request URL.
 */
const getBaseUrl = (context: ServiceContext): string => {
	if (context.config.host?.trim()) {
		return normalizeHost(context.config.host);
	}

	const url = new URL(context.request.url);
	return normalizeHost(url.origin);
};

export default getBaseUrl;
