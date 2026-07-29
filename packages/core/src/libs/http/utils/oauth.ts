/**
 * Returns OAuth parameters only when every key occurs exactly once.
 */
export const uniqueOAuthParameters = (parameters: URLSearchParams) => {
	const values: Record<string, string> = {};
	for (const key of new Set(parameters.keys())) {
		const entries = parameters.getAll(key);
		if (entries.length !== 1) return undefined;
		values[key] = entries[0] ?? "";
	}
	return values;
};

/**
 * Resolves OAuth client credentials from either a public client_id parameter
 * or confidential HTTP Basic authentication.
 */
export const parseOAuthClientCredentials = (
	authorization: string | undefined,
	bodyClientId: string | undefined,
):
	| {
			clientId: string;
			clientSecret?: string;
	  }
	| undefined => {
	if (!authorization) {
		return bodyClientId ? { clientId: bodyClientId } : undefined;
	}

	const parts = authorization.trim().split(/\s+/);
	if (
		parts.length !== 2 ||
		parts[0]?.toLowerCase() !== "basic" ||
		!parts[1] ||
		!/^[A-Za-z0-9+/]+={0,2}$/.test(parts[1])
	) {
		return undefined;
	}

	const decoded = Buffer.from(parts[1], "base64").toString("utf8");
	const separator = decoded.indexOf(":");
	if (separator < 1) return undefined;

	const clientId = decoded.slice(0, separator);
	const clientSecret = decoded.slice(separator + 1);
	if (
		clientSecret.length === 0 ||
		(bodyClientId !== undefined && bodyClientId !== clientId)
	) {
		return undefined;
	}

	return {
		clientId,
		clientSecret,
	};
};
