import type { Collection, InternalCollectionDocument } from "@types";
import { getMultipleReq } from "@/services/api/documents/useGetMultiple";

/** A document a link on the previewed site goes to. */
export type LinkedDocument = {
	collection: Collection;
	document: InternalCollectionDocument;
	/** The content locale the link's path is the document's route in, or null when every locale shares it. */
	locale: string | null;
};

/** The website a link is on: its site URL's base path, and the locales it's for, or null when it implies none. */
type LinkSite = {
	base: string;
	locales: string[] | null;
};

/** A link's decoded path; a malformed escape is kept as it's written. */
const decodePath = (url: URL) => {
	try {
		return decodeURI(url.pathname);
	} catch {
		return url.pathname;
	}
};

/**
 * Matches the link's origin and longest containing site base path, returning that URL's locales.
 * Unlocalized or unmatched sites imply no locale.
 */
const findLinkSite = (props: {
	url: URL;
	path: string;
	siteUrl: string | null;
	siteUrls: Record<string, string>;
}): LinkSite => {
	const siteUrls: Array<[string | null, string]> = Object.entries(
		props.siteUrls,
	);
	if (siteUrls.length === 0 && props.siteUrl) {
		siteUrls.push([null, props.siteUrl]);
	}
	const sites = siteUrls.flatMap(([locale, siteUrl]) => {
		const url = new URL(siteUrl);
		const base = decodePath(url).replace(/\/+$/, "");
		return url.origin === props.url.origin &&
			(props.path === base || props.path.startsWith(`${base}/`))
			? [{ locale, base }]
			: [];
	});
	if (sites.length === 0) return { base: "", locales: null };

	const base = sites.reduce(
		(longest, site) =>
			site.base.length > longest.length ? site.base : longest,
		"",
	);
	const locales = sites.flatMap((site) =>
		site.base === base && site.locale !== null ? [site.locale] : [],
	);
	return { base, locales: locales.length > 0 ? locales : null };
};

/** The route paths a link's path could be stored as below its website's base path: with or without a trailing slash. */
const toRoutePaths = (path: string, base: string) => {
	const route = path.slice(base.length).replace(/\/+$/, "") || "/";
	return route === "/" ? ["/"] : [route, `${route}/`];
};

/**
 * The locale a document's route has one of the paths in, among `locales` when given. Null when
 * every locale shares its path; undefined when it doesn't have the path in those locales.
 */
const findRouteLocale = (
	document: InternalCollectionDocument,
	paths: string[],
	locales: string[] | null,
) => {
	const routePath = document.route?.path;
	if (!routePath || typeof routePath !== "object") return null;

	const codes = Object.entries(routePath).flatMap(([code, path]) =>
		typeof path === "string" && paths.includes(path) ? [code] : [],
	);
	return locales === null
		? (codes[0] ?? null)
		: codes.find((code) => locales.includes(code));
};

/**
 * Matches a site-relative link against readable collection routes in the site's locales. Shared or
 * unmatched sites accept any locale; the first match wins. Returns null if unmatched.
 */
export const findLinkedDocument = async (props: {
	url: URL;
	/** The default locale's website URL, the only one when there are no content locales. */
	siteUrl: string | null;
	/** Each content locale's website URL, keyed by locale code. */
	siteUrls: Record<string, string>;
	collections: Collection[];
}): Promise<LinkedDocument | null> => {
	const path = decodePath(props.url);
	const site = findLinkSite({ ...props, path });
	const paths = toRoutePaths(path, site.base);
	//* filters match a path in any locale, and a path is at most one document's in each
	const perPage = Math.max(Object.keys(props.siteUrls).length, 1);

	const candidates = await Promise.all(
		props.collections.map(async (collection) => {
			if (!collection.routing) return [];
			try {
				const response = await getMultipleReq({
					collectionKey: collection.key,
					versionType: "latest",
					query: {
						filters: { [`fields.${collection.routing.field}:in`]: paths },
						perPage,
					},
					displayErrorToast: false,
				});
				return response.data.map((document) => ({ collection, document }));
			} catch {
				return [];
			}
		}),
	);
	for (const candidate of candidates.flat()) {
		const locale = findRouteLocale(candidate.document, paths, site.locales);
		if (locale !== undefined) return { ...candidate, locale };
	}
	return null;
};
