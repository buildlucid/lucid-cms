import { defineMiddleware, LucidError } from "@lucidcms/core";
import type { HttpExtensionRegister } from "@lucidcms/core/types";
import { sitemap } from "../constants.js";
import matchRequestOrigin from "../services/match-request-origin.js";
import type { SeoPluginOptionsInternal } from "../services/parse-plugin-options.js";
import resolveSiteUrls from "../services/resolve-site-urls.js";
import createSitemapToolkit from "../toolkit/sitemap/index.js";

const FILE_PREFIX = "sitemap-";
const FILE_SUFFIX = ".xml";

/**
 * Serves `/sitemap.xml` and its `/sitemap-<file>.xml` files on the CMS, only when one of the final
 * config's site URLs is on the CMS's own origin, so it never answers for a site hosted elsewhere.
 * Each request gets the sitemap of the site origin its host matches, as `matchRequestOrigin`
 * picks it. Unknown files, and the index of an origin without pages, are passed on to later routes.
 */
const registerSitemapFiles =
	(options: SeoPluginOptionsInternal): HttpExtensionRegister =>
	(app, config) => {
		const siteUrls = resolveSiteUrls(config);
		if (!siteUrls?.origins.has(new URL(config.url).origin)) return;

		const serveSitemap = defineMiddleware(async ({ hono, context, next }) => {
			//* the index has no file parameter
			const file = hono.req
				.param("file")
				?.slice(FILE_PREFIX.length, -FILE_SUFFIX.length);
			const xml = await createSitemapToolkit(context, options).xml({
				file,
				origin: matchRequestOrigin(siteUrls, hono.req.url),
			});
			//* an unknown file or empty index is left to later routes, which answer 404 unless they serve that path
			if (xml.error?.status === 404) {
				await next();
				return;
			}
			if (xml.error) throw new LucidError(xml.error);

			hono.header("Content-Type", "application/xml; charset=utf-8");
			return hono.body(xml.data, 200);
		});

		app.get(sitemap.indexPath, serveSitemap);
		app.get(`/:file{${FILE_PREFIX}[a-z0-9_-]+\\${FILE_SUFFIX}}`, serveSitemap);
	};

export default registerSitemapFiles;
