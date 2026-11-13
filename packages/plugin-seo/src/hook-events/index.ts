import { defineHookEvents } from "@lucidcms/core";
import type { TransformHookEvent } from "@lucidcms/core/types";
import type { SitemapEntry, SitemapEntryInput } from "../types.js";

/** What a sitemap is being built for. */
export type SeoSitemapEntriesHookMeta = {
	/** The environment published pages were listed from, or latest. */
	environment: string;
	/** The default locale's site URL, which entries without a locale are built from. */
	siteUrl: string;
	/** Each content locale's site URL, keyed by locale code, which its entries are built from. */
	siteUrls: Record<string, string>;
	/**
	 * Language versions of documents left out for `noindex` or a canonical URL elsewhere, with the
	 * `path` and `locale` their entries would have, so hooks that add pages don't list them again on
	 * that locale's site URL. A null locale is a path every locale shares.
	 */
	excluded: Array<Pick<SitemapEntry, "path" | "locale">>;
};

/** The sitemap's pages, in the order they are listed. */
export type SeoSitemapEntriesHookData = {
	entries: SitemapEntryInput[];
};

declare module "@lucidcms/core/types" {
	interface PluginHookEvents {
		seo: {
			/**
			 * Runs over every site origin's entries, after published documents are listed and before
			 * a sitemap keeps its own origin's and splits them into files. Add, change or remove
			 * entries. Added entries may give only `path`, and are listed on their URL's origin.
			 */
			sitemapEntries: TransformHookEvent<
				SeoSitemapEntriesHookMeta,
				SeoSitemapEntriesHookData
			>;
		};
	}
}

/** Hook events projects and plugins can subscribe to with `service: "seo"`. */
export default defineHookEvents({
	key: "seo",
	events: { sitemapEntries: "transform" },
});
