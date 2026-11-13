import type { SitemapEntry, SitemapReadInput } from "../../types.js";

type TrailingSlash = NonNullable<SitemapReadInput["trailingSlash"]>;

const slashPath = (path: string, trailingSlash: TrailingSlash) => {
	if (trailingSlash === "always") {
		return path.endsWith("/") ? path : `${path}/`;
	}
	return path.replace(/\/+$/, "") || "/";
};

const slashUrl = (href: string, trailingSlash: TrailingSlash) => {
	const url = new URL(href);
	url.pathname = slashPath(url.pathname, trailingSlash);
	return url.href;
};

/** Adds or removes the trailing slash on every path and URL, alternates included. Leaves entries as they are without a mode. */
const applyTrailingSlash = (
	entries: SitemapEntry[],
	trailingSlash: TrailingSlash | undefined,
): SitemapEntry[] => {
	if (trailingSlash === undefined) return entries;

	return entries.map((entry) => ({
		...entry,
		path: slashPath(entry.path, trailingSlash),
		url: slashUrl(entry.url, trailingSlash),
		alternates: entry.alternates.map((alternate) => ({
			...alternate,
			url: slashUrl(alternate.url, trailingSlash),
		})),
	}));
};

export default applyTrailingSlash;
