import type { SitemapEntryInput } from "@lucidcms/seo";
import { entryUrl, type SiteUrlFor } from "./entry-urls.js";

/**
 * Links template variants only when there is exactly one path per locale across at least two
 * locales. Adds `x-default` for the default locale.
 */
const linkVersions = (
	entries: Array<{ path: string; locale: string }>,
	props: { siteUrl: SiteUrlFor; defaultLocale: string | null },
): SitemapEntryInput[] => {
	const locales = new Set(entries.map((entry) => entry.locale));
	if (locales.size < 2 || locales.size !== entries.length) return entries;

	const alternates = entries.map((entry) => ({
		hreflang: entry.locale,
		url: entryUrl(entry, props.siteUrl),
	}));
	const fallback = entries.find(
		(entry) => entry.locale === props.defaultLocale,
	);
	if (fallback) {
		alternates.push({
			hreflang: "x-default",
			url: entryUrl(fallback, props.siteUrl),
		});
	}
	return entries.map((entry) => ({
		...entry,
		alternates: alternates.map((alternate) => ({ ...alternate })),
	}));
};

export default linkVersions;
