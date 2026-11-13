import type { SitemapEntryInput } from "@lucidcms/seo";
import { HTML_CONTENT_TYPE } from "../../constants.js";
import getContentType from "../../router/get-content-type.js";
import type { SiteTrailingSlash } from "../../types.js";
import applyTrailingSlash from "../../utils/apply-trailing-slash.js";
import pathUrl from "../../utils/path-url.js";
import routeKey from "../../utils/route-key.js";

/** A locale's site URL, or the default locale's for entries without a locale or a URL of their own. */
export type SiteUrlFor = (locale: string | null | undefined) => string;

/** An entry's URL, or the one the SEO plugin fills in from its path and locale when it has none. */
export const entryUrl = (entry: SitemapEntryInput, siteUrl: SiteUrlFor) => {
	if (entry.url !== undefined) return entry.url;
	return pathUrl(siteUrl(entry.locale), entry.path).href;
};

/**
 * Which page an entry is: the host and path of its URL, or of the one its locale gives it, as one
 * path can be a page on each domain. Unreadable URLs are kept whole for the SEO plugin to reject.
 */
export const pageKey = (entry: SitemapEntryInput, siteUrl: SiteUrlFor) => {
	const href = entryUrl(entry, siteUrl);
	if (!URL.canParse(href)) return href;
	const url = new URL(href);
	return `${url.host}${routeKey(url.pathname)}`;
};

/** The form of a path the site serves without redirecting: HTML pages follow `trailingSlash`, file pages keep theirs. */
export const slashPath = (path: string, trailingSlash: SiteTrailingSlash) =>
	getContentType(path) === HTML_CONTENT_TYPE
		? applyTrailingSlash(path, trailingSlash)
		: path;

/** A URL as `slashPath` gives its path. Unreadable URLs are left for the SEO plugin to reject with its own error. */
export const slashUrl = (href: string, trailingSlash: SiteTrailingSlash) => {
	if (!URL.canParse(href)) return href;
	const url = new URL(href);
	url.pathname = slashPath(url.pathname, trailingSlash);
	return url.href;
};
