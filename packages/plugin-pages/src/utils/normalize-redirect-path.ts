/** Lowercases a website path and drops its trailing slash, matching how page paths are stored. */
const normalizeRedirectPath = (path: string) => {
	const lowercased = path.trim().toLowerCase();
	return lowercased.length > 1 && lowercased.endsWith("/")
		? lowercased.slice(0, -1)
		: lowercased;
};

export default normalizeRedirectPath;
