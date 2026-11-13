import packageJson from "../package.json" with { type: "json" };

export const PLUGIN_KEY = "@lucidcms/seo";

export const PACKAGE_INFO = {
	name: packageJson.name,
	version: packageJson.version,
};
export const COMPONENTS_MODULE = "@lucidcms/seo/components";

export const sitemap = {
	/**
	 * Search engines read at most 50,000 URLs and 50 MB (52,428,800 bytes) uncompressed a file.
	 * These leave room below both.
	 */
	fileLimits: { urls: 45_000, bytes: 45 * 1024 * 1024 },
	/** Where the sitemap index is served on each site origin. */
	indexPath: "/sitemap.xml",
	/** Where pages that hooks add without a `file` are listed. */
	defaultFile: "site",
	/** The API key scope the content API routes require. */
	scope: "sitemap:read",
	/** Content API route prefix, beneath `/api/v1/content/e`. */
	route: "/seo/sitemap",
	/** What file names may contain, the same as collection keys, so they fit in `/sitemap-<name>.xml`. */
	fileName: /^[a-z0-9_-]+$/,
} as const;

export const robots = {
	/** The API key scope the content API route requires. */
	scope: "robots:read",
	/** Content API route, beneath `/api/v1/content/e`. */
	route: "/seo/robots",
} as const;

export const indexNow = {
	/** Where URLs are sent unless `indexNow.endpoint` names another IndexNow endpoint. */
	endpoint: "https://api.indexnow.org/indexnow",
	/** The most URLs one IndexNow POST may carry. */
	batchSize: 10_000,
	/** How long one POST may take before the send stops and is retried. */
	requestTimeoutMs: 30_000,
	/** What IndexNow accepts as a key. */
	key: /^[a-zA-Z0-9-]{8,128}$/,
	/** Each listed URL with its `lastModified`, and whether it still has to be sent. */
	urlsTable: "plugin_seo_index_now_urls",
	/** One row: the last send IndexNow accepted URLs from, and the mark count that orders marks. */
	stateTable: "plugin_seo_index_now_state",
	/** Admin route the Operations tile queues a send with. */
	sendRoute: "/api/v1/seo/index-now/send",
	/** Admin route the Operations tile reads pending pages and the last send from. */
	statusRoute: "/api/v1/seo/index-now/status",
	/** Sends from the tile per user within the window. Each one reads every listed page. */
	rateLimit: 5,
	rateLimitWindowMs: 15 * 60 * 1000,
} as const;

export const fields = {
	title: "title",
	description: "description",
	socialTitle: "socialTitle",
	socialDescription: "socialDescription",
	socialImage: "socialImage",
	socialImageAlt: "socialImageAlt",
	ogType: "ogType",
	xCard: "xCard",
	xTitle: "xTitle",
	xDescription: "xDescription",
	xImage: "xImage",
	xImageAlt: "xImageAlt",
	canonicalUrl: "canonicalUrl",
	indexing: "indexing",
	following: "following",
	maxSnippet: "maxSnippet",
	maxImagePreview: "maxImagePreview",
	maxVideoPreview: "maxVideoPreview",
	structuredData: "structuredData",
	metadata: "metadata",
	attribute: "attribute",
	name: "name",
	content: "content",
} as const;
