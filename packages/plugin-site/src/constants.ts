import { pluginPublicPath } from "@lucidcms/core/extension";

export const PLUGIN_KEY = "@lucidcms/plugin-site";
export const LUCID_VERSION = "0.x.x";

export const TEMPLATE_EXTENSION = ".kiln";
export const DEFAULT_SITE_DIRECTORY = "site";
export const PAGES_DIRECTORY = "pages";
/** Where `site:build` writes the static site, relative to the project root. */
export const DEFAULT_STATIC_OUTPUT_DIRECTORY = "dist-site";

/** The script that connects a development page to Vite's dev server, for reloads and hot updates. */
export const VITE_CLIENT = "/@vite/client";
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
/** The outlet UI components add their head content to, such as Svelte's `<svelte:head>`. */
export const HEAD_OUTLET = "head";
export const ISLANDS_URL = `/${pluginPublicPath(PLUGIN_KEY, "islands")}/`;

/**
 * How long stored pages, their island entries and fragments stay in KV when no shorter TTL is given.
 * Token checks already catch stale entries, so this only bounds storage: each build uses a new cache namespace, which orphans the last build's entries.
 */
export const DEFAULT_STORE_LIFETIME_SECONDS = 30 * 24 * 60 * 60;

export const storeKeys = {
	page: (version: string, locale: string, path: string) =>
		`${PLUGIN_KEY}:page:${version}:${locale}:${path}`,
	island: (id: string) => `${PLUGIN_KEY}:island:${id}`,
	fragment: (key: string) => `${PLUGIN_KEY}:fragment:${key}`,
} as const;
