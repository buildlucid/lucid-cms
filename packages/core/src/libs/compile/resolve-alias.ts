/** Applies bundle aliases to whole specifiers and their subpaths, returning the replacement or undefined. */
const resolveAlias = (id: string, alias: Record<string, string> = {}) => {
	for (const [find, replacement] of Object.entries(alias)) {
		if (id === find || id.startsWith(`${find}/`)) {
			return replacement + id.slice(find.length);
		}
	}
};

export default resolveAlias;
