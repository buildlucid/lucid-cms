import {
	ACCEPT_HEADER,
	AUTHORIZATION_HEADER,
	CONTENT_TYPE_HEADER,
	JSON_CONTENT_TYPE,
	LOCALE_HEADER,
} from "../../constants.js";
import type { LucidHeaderFactory } from "../../types/transport.js";

/**
 * Lets internal request setup treat static and lazy header sources the same way.
 */
const resolveHeaders = async (
	headers?: HeadersInit | LucidHeaderFactory,
): Promise<HeadersInit | undefined> => {
	if (!headers) return undefined;
	if (typeof headers === "function") return await headers();
	return headers;
};

/**
 * Merges header layers in overwrite order so request-specific values win predictably.
 */
const mergeHeaders = (
	...headerSets: Array<HeadersInit | undefined>
): Headers => {
	const headers = new Headers();

	for (const headerSet of headerSets) {
		if (!headerSet) continue;
		const current = new Headers(headerSet);

		for (const [key, value] of current.entries()) {
			headers.set(key, value);
		}
	}

	return headers;
};

/**
 * Builds the final Lucid request headers, including auth, locale, and JSON body defaults.
 */
export const buildRequestHeaders = async (input: {
	baseHeaders?: HeadersInit | LucidHeaderFactory;
	requestHeaders?: HeadersInit;
	apiKey: string;
	localeCode?: string;
	hasBody: boolean;
}): Promise<Headers> => {
	const baseHeaders = await resolveHeaders(input.baseHeaders);
	const headers = mergeHeaders(baseHeaders, input.requestHeaders);

	headers.set(ACCEPT_HEADER, JSON_CONTENT_TYPE);
	headers.set(AUTHORIZATION_HEADER, input.apiKey);

	if (input.localeCode) {
		headers.set(LOCALE_HEADER, input.localeCode);
	}

	if (input.hasBody && !headers.has(CONTENT_TYPE_HEADER)) {
		headers.set(CONTENT_TYPE_HEADER, JSON_CONTENT_TYPE);
	}

	return headers;
};
