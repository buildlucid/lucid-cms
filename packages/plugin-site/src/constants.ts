import { pluginPublicPath } from "@lucidcms/core/extension";

export const PLUGIN_KEY = "plugin-site";
export const LUCID_VERSION = "0.x.x";

export const TEMPLATE_EXTENSION = ".kiln";
export const DEFAULT_SITE_DIRECTORY = "site";
export const PAGES_DIRECTORY = "pages";
export const STATIC_OUTPUT_DIRECTORY = "site";

/** URL prefix for the site's Vite files, served by Vite in development and from `public/assets` once built. */
export const ASSETS_BASE = "/assets/";
export const VITE_CACHE_DIRECTORY = ".lucid/vite/site";

export const errorPages = {
	notFound: "pages/_404.kiln",
	serverError: "pages/_500.kiln",
} as const;

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
