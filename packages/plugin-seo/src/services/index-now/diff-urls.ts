/** What a mark changes: listed URLs to store as pending, and URLs no longer listed. */
type IndexNowDiff = {
	changed: Array<{ url: string; lastModified: string | null }>;
	removed: string[];
};

/**
 * Diffs current and stored listed URLs by `lastModified`, returning new, changed and removed pages
 * for recrawling.
 */
const diffUrls = (
	listed: ReadonlyMap<string, string | null>,
	stored: ReadonlyMap<string, string | null>,
): IndexNowDiff => {
	const changed: IndexNowDiff["changed"] = [];
	for (const [url, lastModified] of listed) {
		if (stored.has(url) && stored.get(url) === lastModified) continue;
		changed.push({ url, lastModified });
	}
	const removed = [...stored.keys()].filter((url) => !listed.has(url));
	return { changed, removed };
};

export default diffUrls;
