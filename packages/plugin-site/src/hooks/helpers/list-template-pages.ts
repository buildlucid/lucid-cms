import type {
	SeoSitemapEntriesHookMeta,
	SitemapEntryInput,
} from "@lucidcms/seo";
import { HTML_CONTENT_TYPE } from "../../constants.js";
import evaluatePagePaths from "../../router/evaluate-page-paths.js";
import isDynamicPattern from "../../router/is-dynamic-pattern.js";
import type { Site } from "../../site/create-site-loader.js";
import resolvePathLocale from "../../site/resolve-path-locale.js";
import type { SitePage, SiteState } from "../../types.js";
import pathUrl from "../../utils/path-url.js";
import routeKey from "../../utils/route-key.js";
import { pageKey, type SiteUrlFor } from "./entry-urls.js";
import linkVersions from "./link-versions.js";

/**
 * Lists eligible template paths once per domain using static-build evaluation. Includes static
 * HTML pages unless opted out; dynamic pages must opt in. Skips error pages, existing URLs and SEO
 * exclusions. Shared paths are listed once on the default domain.
 */
const listTemplatePages = async (props: {
	site: Site;
	entries: SitemapEntryInput[];
	excluded: SeoSitemapEntriesHookMeta["excluded"];
	/** Exports run before any page renders, so there is no request path; each domain gives the locale. */
	state: Omit<SiteState, "locale">;
	siteUrl: SiteUrlFor;
	defaultLocale: string | null;
}): Promise<SitemapEntryInput[]> => {
	const { site } = props;
	// A page left out in one of the site's locales is taken on that locale's domain only.
	const taken = new Set(
		[
			...props.entries,
			...props.excluded.filter(
				(entry) => entry.locale && site.config.locales.has(entry.locale),
			),
		].map((entry) => pageKey(entry, props.siteUrl)),
	);
	// An entry without a locale on the default locale's domain is a path every locale shares.
	const shared = props.entries.filter(
		(entry) =>
			!entry.locale &&
			pageKey(entry, props.siteUrl) ===
				pageKey({ path: entry.path }, props.siteUrl),
	);
	const sharedPaths = new Set(
		[...props.excluded.filter((entry) => !entry.locale), ...shared].map(
			(entry) => routeKey(entry.path),
		),
	);

	const pages = site.pages.filter((page) =>
		isDynamicPattern(page.pattern)
			? page.sitemap === true
			: page.sitemap !== false && page.contentType === HTML_CONTENT_TYPE,
	);
	const dynamic = pages.filter((page) => isDynamicPattern(page.pattern));

	const listed = new Map<SitePage, Array<{ path: string; locale: string }>>();
	for (const domain of site.config.domains) {
		// Each of a domain's locales has its site URL there, so any of them gives its pages' URLs.
		const siteUrl = props.siteUrl(domain.locales[0]);
		// Without exports to run there is no empty path to give a locale.
		const evaluated =
			dynamic.length === 0
				? []
				: await evaluatePagePaths({
						site,
						pages: dynamic,
						state: {
							...props.state,
							locale: resolvePathLocale(site.config, "", new URL(siteUrl)),
						},
					});
		const paths = new Map(evaluated.map((item) => [item.page, item.paths]));
		for (const page of pages) {
			const versions = listed.get(page) ?? [];
			for (const path of paths.get(page) ?? [page.pattern]) {
				const locale = resolvePathLocale(
					site.config,
					path,
					pathUrl(siteUrl, path),
				);
				const key = pageKey({ path, locale }, props.siteUrl);
				if (taken.has(key) || sharedPaths.has(routeKey(path))) continue;
				taken.add(key);
				versions.push({ path, locale });
			}
			listed.set(page, versions);
		}
	}

	return pages.flatMap((page) => linkVersions(listed.get(page) ?? [], props));
};

export default listTemplatePages;
