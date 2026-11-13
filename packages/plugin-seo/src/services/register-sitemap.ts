import { copy } from "@lucidcms/core";
import type { ResolvedLucidConfig } from "@lucidcms/core/types";
import { PLUGIN_KEY, sitemap } from "../constants.js";
import registerSitemapFiles from "../http/register-sitemap-files.js";
import sitemapRoutes from "../routes/sitemap.js";
import addRootFiles from "./add-root-files.js";
import type { SeoPluginOptionsInternal } from "./parse-plugin-options.js";

/** Adds the sitemap's API key scope, its content API routes and the CMS's own sitemap files. */
const registerSitemap = (
	draft: ResolvedLucidConfig,
	options: SeoPluginOptionsInternal,
) => {
	draft.access.push({
		key: "sitemap",
		name: copy("admin:plugin.seo.access.sitemap.label"),
		scopes: {
			[sitemap.scope]: {
				//* sitemaps only list what the site already shows
				userPermission: null,
				name: copy("admin:plugin.seo.access.sitemap.read"),
			},
		},
	});
	draft.http.routes.push(...sitemapRoutes(options));
	addRootFiles(draft, `${PLUGIN_KEY}:sitemap`, registerSitemapFiles(options));
};

export default registerSitemap;
