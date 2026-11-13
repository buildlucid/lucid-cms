/** A stored path as a site path, which starts with a slash. */
export const toSitePath = (path: string) =>
	path.startsWith("/") ? path : `/${path}`;

/** A page's absolute URL: the path on the site's origin, as the admin's live links build it. */
export const buildPageUrl = (siteUrl: string | URL, path: string) => {
	const url = new URL("/", siteUrl);
	url.pathname = toSitePath(path);
	return url.href;
};

const normalizeUrl = (href: string) => {
	const url = new URL(href);
	url.hash = "";
	url.pathname = url.pathname.replace(/\/+$/, "") || "/";
	return url.href;
};

/**
 * Whether a canonical URL override points away from the page's own URL, which leaves the page out
 * of the sitemap. A trailing slash difference is the same page. Unreadable values are ignored.
 */
export const isCanonicalElsewhere = (
	canonicalUrl: string | null | undefined,
	pageUrl: string,
) => {
	const canonical = canonicalUrl?.trim();
	if (!canonical) return false;

	try {
		return normalizeUrl(canonical) !== normalizeUrl(pageUrl);
	} catch {
		return false;
	}
};
