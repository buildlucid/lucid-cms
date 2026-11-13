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
