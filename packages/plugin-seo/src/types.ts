/** Registers an SEO fixed brick on existing collections. */
export interface SeoPluginOptions {
	collections: Array<{
		/** Existing collection key. */
		key: string;
		/** Follows collection localization by default. */
		localized?: boolean;
		/** Fixed brick key. Defaults to "seo". */
		brickKey?: string;
	}>;
	/**
	 * Lists published pages at `/sitemap.xml`, through `toolkit.seo.sitemap` and the content API.
	 * On by default. URLs are built from the config's `siteUrl`, each locale's own when it has one,
	 * and each site origin gets its own sitemap of its own pages. Set to false to turn it off.
	 */
	sitemap?: false | SeoSitemapOptions;
	/**
	 * Serves `/robots.txt`, through `toolkit.seo.robots` and the content API. On by default, letting
	 * every crawler in and pointing it at the sitemap. Set to false to turn it off.
	 */
	robots?: false | SeoRobotsOptions;
	/**
	 * Tells search engines which pages changed through IndexNow: every send submits the sitemap's
	 * pages that are new, changed or gone since the last one. Off unless given, and needs the sitemap.
	 */
	indexNow?: SeoIndexNowOptions;
}

export type SeoIndexNowOptions = {
	/** 8 to 128 letters, numbers and hyphens. Served at `/<key>.txt` so search engines can check it. */
	key: string;
	/**
	 * The key of the deploy that puts the site live. Sends then wait for its runs to succeed instead
	 * of following publishes. Leave it out when published pages are live straight away.
	 */
	deploy?: string;
	/**
	 * The IndexNow endpoint. Defaults to `https://api.indexnow.org/indexnow`, which shares URLs with
	 * every search engine that takes part.
	 */
	endpoint?: string;
};

export type SeoRobotsOptions = {
	/**
	 * Groups to write instead of the default, which allows everything and, on the CMS's own origin,
	 * disallows the admin. They replace the default entirely. The `Sitemap:` line is still added
	 * while the sitemap is on.
	 */
	rules?: RobotsRule[];
};

/** One robots.txt group: the crawlers it applies to and the paths they may or may not fetch. It needs at least one path. */
export type RobotsRule = {
	/** Crawler names, such as `*` for every crawler or `Googlebot`. */
	userAgent: string | string[];
	/** Paths crawlers may fetch, starting with `/` or `*`, such as `/blog/` or `*.css$`. */
	allow?: string | string[];
	/** Paths crawlers may not fetch, starting with `/` or `*`, such as `/search`. */
	disallow?: string | string[];
};

/** Options for reading robots.txt. */
export type RobotsReadInput = {
	/** The site origin it is for, such as `https://example.fr`. Defaults to the default locale's. */
	origin?: string;
};

export type SeoSitemapOptions = {
	/** SEO collection keys to list. Defaults to every SEO collection with `routing`. */
	collections?: string[];
	/**
	 * The environment listed when a call doesn't name one. Defaults to the final environment your
	 * collections share, or latest when none of them have environments.
	 */
	environment?: string;
};

/** Another language version of a sitemap page, written as an `xhtml:link` hreflang link. */
export type SitemapAlternate = {
	/** A locale code, or `x-default` for the default locale's version. */
	hreflang: string;
	url: string;
};

/** One page in the sitemap. */
export type SitemapEntry = {
	/** The path on the site, such as `/en/about`. */
	path: string;
	/** The absolute URL, built from the config's `siteUrl` for its locale. */
	url: string;
	/** The locale of this language version, or null for pages without one. */
	locale: string | null;
	/** When the listed version last changed, as an ISO date, or null when unknown. */
	lastModified: string | null;
	/** Every listed language version of the page, itself included, and `x-default`. Empty for pages in one language. */
	alternates: SitemapAlternate[];
	/** The sitemap file the page is listed in: the collection key for documents, `site` by default for others. */
	file: string;
};

/**
 * An entry as `seo.sitemapEntries` hooks may give it. Missing values are filled in afterwards:
 * `url` from `path` and its locale's site URL, `locale: null`, `lastModified: null`, `alternates: []` and
 * `file: "site"`. Change `url` along with `path`, or delete it to have it rebuilt.
 */
export type SitemapEntryInput = Pick<SitemapEntry, "path"> &
	Partial<Omit<SitemapEntry, "path">>;

/** A file of the sitemap, as the index lists it. */
export type SitemapFile = {
	/** Such as `page`, or `page-2` for the second file of a collection with more pages than one file holds. */
	name: string;
	/** The file's path on the site, such as `/sitemap-page.xml`. */
	path: string;
	/** The file's absolute URL, on the origin the sitemap is for. */
	url: string;
	/** How many pages the file lists. */
	count: number;
	/** The newest `lastModified` of its pages, or null when none have one. */
	lastModified: string | null;
};

/** Options every sitemap read takes. */
export type SitemapReadInput = {
	/**
	 * The site origin to list pages for, such as `https://example.fr`, when locales have their own
	 * domains. Only pages whose URL is on it are listed. Defaults to the default locale's.
	 */
	origin?: string;
	/** The environment to list published pages from, or `latest`. Defaults to the plugin's `sitemap.environment`. */
	environment?: string;
	/** Adds or removes trailing slashes on every path and URL. Paths are left as stored by default. */
	trailingSlash?: "always" | "never";
};

/** A sitemap read that can be narrowed to one file. */
export type SitemapFileReadInput = SitemapReadInput & {
	/** A file name from `files()`, such as `page` or `page-2`. */
	file?: string;
};
