import { pluginPublicPath } from "@lucidcms/core/extension";

export const PLUGIN_KEY = "plugin-site";
export const LUCID_VERSION = "0.x.x";

export const TEMPLATE_EXTENSION = ".kiln";
export const DEFAULT_SITE_DIRECTORY = "site";
export const PAGES_DIRECTORY = "pages";
/** Where `site:build` writes the static site, relative to the project root. */
export const DEFAULT_STATIC_OUTPUT_DIRECTORY = "dist-site";

/** Vite URL prefix reserved for site builds, like `/_plugins`, served by Vite in development and from `public/_assets` once built. */
export const ASSETS_BASE = "/_assets/";
export const VITE_CACHE_DIRECTORY = ".lucid/vite/site";
/** Built asset names hold a content hash, so browsers and CDNs may keep them for a year. */
export const IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable";
export const CLOUDFLARE_RUNTIME = "cloudflare";

export const errorPages = {
	notFound: "pages/_404.kiln",
	serverError: "pages/_500.kiln",
} as const;

export const HTML_CONTENT_TYPE = "text/html; charset=utf-8";
/** Content types for page files ending in another extension, such as `pages/feed.xml.kiln`. */
export const contentTypes: Record<string, string> = {
	xml: "application/xml; charset=utf-8",
	rss: "application/rss+xml; charset=utf-8",
	txt: "text/plain; charset=utf-8",
	json: "application/json; charset=utf-8",
};

export const redirectStatuses = [301, 302, 303, 307, 308] as const;

export const PREVIEW_COOKIE = "lucid_preview";
export const CLIENT_SCRIPT_PATH = pluginPublicPath(PLUGIN_KEY, "lucid.js");
export const ISLANDS_URL = `/${pluginPublicPath(PLUGIN_KEY, "islands")}/`;

export const storeKeys = {
	page: (version: string, path: string) =>
		`${PLUGIN_KEY}:page:${version}:${path}`,
	island: (id: string) => `${PLUGIN_KEY}:island:${id}`,
	fragment: (key: string) => `${PLUGIN_KEY}:fragment:${key}`,
} as const;
