import type { SitemapEntryInput } from "@lucidcms/seo";
import type { SiteTrailingSlash } from "../../types.js";
import { entryUrl, type SiteUrlFor, slashUrl } from "./entry-urls.js";

/**
 * Leaves out the entries `drop` picks and language versions in CMS locales the site doesn't
 * render, along with every hreflang link to them and an `x-default` that pointed at one, changing
 * the kept entries' links in place. URLs compare as the site lists them, so a trailing slash makes
 * no difference. Pages left with one language version lose their links, as the SEO plugin lists them.
 */
const dropEntries = (
	entries: SitemapEntryInput[],
	props: {
		locales: ReadonlySet<string>;
		siteUrl: SiteUrlFor;
		trailingSlash: SiteTrailingSlash;
		drop: (entry: SitemapEntryInput) => boolean;
	},
) => {
	const listedUrl = (href: string) => slashUrl(href, props.trailingSlash);
	const dropped = new Set<string>();
	const kept = entries.filter((entry) => {
		const isDropped =
			(entry.locale ? props.locales.has(entry.locale) : false) ||
			props.drop(entry);
		if (isDropped) dropped.add(listedUrl(entryUrl(entry, props.siteUrl)));
		return !isDropped;
	});

	for (const entry of kept) {
		if (!entry.alternates) continue;

		// An x-default shares its URL with the language version it points at, so it goes with it.
		const gone = new Set(
			entry.alternates
				.filter(
					(alternate) =>
						props.locales.has(alternate.hreflang) ||
						dropped.has(listedUrl(alternate.url)),
				)
				.map((alternate) => listedUrl(alternate.url)),
		);
		const alternates = entry.alternates.filter(
			(alternate) => !gone.has(listedUrl(alternate.url)),
		);
		const versions = alternates.filter(
			(alternate) => alternate.hreflang !== "x-default",
		);
		entry.alternates = versions.length < 2 ? [] : alternates;
	}
	return kept;
};

export default dropEntries;
