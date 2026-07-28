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
