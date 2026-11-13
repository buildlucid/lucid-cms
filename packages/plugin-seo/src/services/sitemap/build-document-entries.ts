import {
	buildPageUrl,
	isCanonicalElsewhere,
	toSitePath,
} from "../../shared/urls.js";
import type { SitemapAlternate, SitemapEntry } from "../../types.js";
import type { SiteUrls } from "../resolve-site-urls.js";

/** One language version of a published document, as the sitemap query reads it. */
export type SitemapDocumentRow = {
	documentId: number;
	locale: string | null;
	path: string;
	lastModified: string | null;
	indexing: string | null;
	canonicalUrl: string | null;
};

/** A collection's listed pages, and the paths and locales of those left out. */
export type SitemapDocumentEntries = {
	entries: SitemapEntry[];
	excluded: Array<Pick<SitemapEntry, "path" | "locale">>;
};

/**
 * Turns a collection's rows into entries on their locale's site URL, leaving out noindex pages and
 * pages whose canonical URL points away from that URL, whose paths and locales are returned so
 * hooks don't list them again. A document's listed language versions link to each other, across
 * domains when each locale has its own, and to the default locale's version as `x-default`.
 */
const buildDocumentEntries = (props: {
	rows: SitemapDocumentRow[];
	file: string;
	siteUrls: SiteUrls;
	defaultLocale: string | null;
}): SitemapDocumentEntries => {
	const documents = new Map<number, SitemapEntry[]>();
	const excluded: SitemapDocumentEntries["excluded"] = [];

	for (const row of props.rows) {
		const url = buildPageUrl(props.siteUrls.forLocale(row.locale), row.path);
		if (
			row.indexing === "noindex" ||
			isCanonicalElsewhere(row.canonicalUrl, url)
		) {
			excluded.push({ path: toSitePath(row.path), locale: row.locale });
			continue;
		}

		const entries = documents.get(row.documentId) ?? [];
		entries.push({
			path: toSitePath(row.path),
			url,
			locale: row.locale,
			lastModified: row.lastModified,
			alternates: [],
			file: props.file,
		});
		documents.set(row.documentId, entries);
	}

	return {
		entries: [...documents.values()].flatMap((entries) => {
			const versions = entries.flatMap((entry): SitemapAlternate[] =>
				entry.locale === null
					? []
					: [{ hreflang: entry.locale, url: entry.url }],
			);
			if (versions.length < 2) return entries;

			const fallback = entries.find(
				(entry) => entry.locale === props.defaultLocale,
			);
			const alternates = [
				...versions,
				...(fallback ? [{ hreflang: "x-default", url: fallback.url }] : []),
			];
			return entries.map((entry) => ({
				...entry,
				alternates: alternates.map((alternate) => ({ ...alternate })),
			}));
		}),
		excluded,
	};
};

export default buildDocumentEntries;
