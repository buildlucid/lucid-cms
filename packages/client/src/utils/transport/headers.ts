import {
	ACCEPT_HEADER,
	AUTHORIZATION_HEADER,
	CONTENT_TYPE_HEADER,
	JSON_CONTENT_TYPE,
} from "../../constants.js";
import type {
	LucidClientAuth,
	LucidHeaderFactory,
} from "../../types/transport.js";

/**
 * Resolves the configured credential for the current request attempt.
 */
export const resolveAuthorizationHeader = async (
	auth: LucidClientAuth,
): Promise<
	| {
			data: string;
			error: undefined;
	  }
	| {
			data: undefined;
			error: string;
	  }
> => {
	if (auth.type === "apiKey") {
		if (!auth.apiKey.trim()) {
			return {
				data: undefined,
				error: "`auth.apiKey` is required to create a Lucid client.",
			};
		}

		return {
			data: `ApiKey ${auth.apiKey}`,
			error: undefined,
		};
	}

	let accessToken: string;
	try {
		accessToken =
			typeof auth.accessToken === "function"
				? await auth.accessToken()
				: auth.accessToken;
	} catch {
		return {
			data: undefined,
			error: "The OAuth access token provider failed.",
		};
	}

	if (!accessToken.trim()) {
		return {
			data: undefined,
			error: "`auth.accessToken` must resolve to an access token.",
		};
	}

	return {
		data: `Bearer ${accessToken}`,
		error: undefined,
	};
};

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
 * Builds the final Lucid request headers, including auth and JSON body defaults.
 */
export const buildRequestHeaders = async (input: {
	baseHeaders?: HeadersInit | LucidHeaderFactory;
	requestHeaders?: HeadersInit;
	authorization: string;
	hasBody: boolean;
}): Promise<Headers> => {
	const baseHeaders = await resolveHeaders(input.baseHeaders);
	const headers = mergeHeaders(baseHeaders, input.requestHeaders);

	headers.set(ACCEPT_HEADER, JSON_CONTENT_TYPE);
	headers.set(AUTHORIZATION_HEADER, input.authorization);

	if (input.hasBody && !headers.has(CONTENT_TYPE_HEADER)) {
		headers.set(CONTENT_TYPE_HEADER, JSON_CONTENT_TYPE);
	}

	return headers;
};
