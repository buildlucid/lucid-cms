import { defineMiddleware, logger } from "@lucidcms/core";
import type {
	HttpExtensionRegister,
	ServiceContext,
} from "@lucidcms/core/types";
import { findRoute } from "rou3";
import coalesceRenders from "../cache/coalesce-renders.js";
import readStoredPage from "../cache/read-stored-page.js";
import renderStoredPage from "../cache/render-stored-page.js";
import {
	HTML_CONTENT_TYPE,
	ISLANDS_URL,
	PLUGIN_KEY,
	storeKeys,
} from "../constants.js";
import { SiteNotFoundError } from "../errors.js";
import createSiteMarkup from "../preview/create-site-markup.js";
import { pageMarkup } from "../preview/page-markup.js";
import readPreview from "../preview/read-preview.js";
import getContentType from "../router/get-content-type.js";
import getRouteParams from "../router/get-route-params.js";
import type { Site } from "../site/create-site-loader.js";
import readSiteModule from "../site/read-site-module.js";
import type shareSiteLoader from "../site/share-site-loader.js";
import type { SitePluginOptionsInternal, SiteState } from "../types.js";
import decode from "../utils/decode.js";
import isLucidPath from "../utils/is-lucid-path.js";
import normalizePath from "../utils/normalize-path.js";
import createDevErrorPage from "./create-dev-error-page.js";
import findCanonicalPath from "./find-canonical-path.js";
import readRequestLocale from "./read-request-locale.js";
import renderIsland from "./render-island.js";
import renderPage from "./render-page.js";
import respondToRenderError from "./respond-to-render-error.js";

const canStorePages = (context: ServiceContext) => {
	if (context.kv.key !== "passthrough") return true;

	logger.warn({
		scope: PLUGIN_KEY,
		event: "plugin-site.isr.no-kv",
		dedupeKey: `${PLUGIN_KEY}:isr-no-kv`,
		message:
			"ISR pages need a KV adapter to be stored, so they render on every request. Add a KV plugin, such as @lucidcms/sqlite-kv.",
	});
	return false;
};

/**
 * Serves the site's pages. `files` serves only file pages, such as `pages/sitemap.xml.kiln`, so they
 * answer before plugins' routes at the same path, and passes every other request on, including all
 * of them while the site fails to load. `pages` serves islands and every other page after all other
 * routes, and reports a site that fails to load. No page shares a path with a public file, which
 * development and builds report.
 */
const registerSiteRoute =
	(
		options: SitePluginOptionsInternal,
		siteLoader: ReturnType<typeof shareSiteLoader>,
		serves: "files" | "pages",
	): HttpExtensionRegister =>
	(app, config) => {
		const getSite = siteLoader(config);

		if (serves === "pages") {
			app.get(
				`${ISLANDS_URL}:id`,
				defineMiddleware(async ({ hono, toolkit, context }) => {
					const site = await getSite({ context });
					try {
						return await renderIsland({
							hono,
							context,
							toolkit,
							site,
							id: hono.req.param("id") ?? "",
						});
					} catch (error) {
						logger.error({
							scope: PLUGIN_KEY,
							event: "plugin-site.island.failed",
							message: "Failed to render an island",
							error,
						});
						return hono.text("Island failed to render", 500);
					}
				}),
			);
		}

		app.get(
			"/*",
			defineMiddleware(async ({ hono, toolkit, context, next }) => {
				const { pathname, search } = new URL(hono.req.url);
				const path = normalizePath(decode(pathname));
				if (isLucidPath(path)) {
					await next();
					return;
				}
				// File pages end in their extension, so other paths needn't load the site.
				if (serves === "files" && getContentType(path) === HTML_CONTENT_TYPE) {
					await next();
					return;
				}

				const development = context.runtimeContext?.compiled === false;
				let site: Site;
				try {
					site = await getSite({ context });
				} catch (error) {
					// A site that can't load serves no file pages, and the pages route reports why.
					if (serves === "files") {
						await next();
						return;
					}
					// Show site-loading failures, including invalid page exports, as development error pages.
					if (!development) throw error;
					logger.error({
						scope: PLUGIN_KEY,
						event: "plugin-site.load.failed",
						message: "Failed to load the site",
						error,
					});
					const data = readSiteModule(context.runtimeContext)?.data ?? null;
					return hono.html(createDevErrorPage({ error, data }), 500);
				}

				const match = findRoute(site.router, "GET", pathname);
				if (
					serves === "files" &&
					(!match || match.data.contentType === HTML_CONTENT_TYPE)
				) {
					await next();
					return;
				}

				// The query string, such as a preview token, must survive the redirect.
				const canonical = findCanonicalPath({
					pathname,
					router: site.router,
					trailingSlash: options.trailingSlash,
				});
				if (canonical) return hono.redirect(`${canonical}${search}`, 301);

				const previewResult = await readPreview({ hono, toolkit });
				if ("response" in previewResult) return previewResult.response;
				const { preview } = previewResult;

				const { locale, vary } = readRequestLocale(hono, site, path);
				// Caches must keep a copy per value of whatever chose the locale.
				if (vary.length > 0)
					hono.header("Vary", vary.join(", "), { append: true });
				const state: SiteState = {
					toolkit,
					context,
					path,
					locale,
					preview,
					version: site.config.getVersion,
				};
				pageMarkup.set(state, {
					...createSiteMarkup(preview),
					footerWritten: false,
				});
				// Previews keep the no-store header the toolkit set, and development skips caching so edits show.
				const cacheable = !preview && !development;

				try {
					if (!match) throw new SiteNotFoundError();

					const cacheControl = cacheable ? match.data.cacheControl : undefined;

					if (!preview && match.data.mode === "isr" && canStorePages(context)) {
						const key = storeKeys.page(site.cacheNamespace, locale, path);
						const stored =
							(await readStoredPage(context, key)) ??
							(await coalesceRenders(key, () =>
								renderStoredPage({
									context,
									site,
									page: match.data,
									params: getRouteParams(match),
									state,
								}),
							));
						return hono.body(stored.body, 200, {
							"content-type": stored.contentType,
							...(cacheControl ? { "cache-control": cacheControl } : {}),
						});
					}

					return await renderPage({
						hono,
						site,
						match,
						state,
						cacheControl,
						development,
					});
				} catch (error) {
					const response = await respondToRenderError({
						hono,
						site,
						state,
						error,
						development,
						cacheControl: cacheable ? options.cacheControl : undefined,
					});
					if (response) return response;
					await next();
				}
			}),
		);
	};

export default registerSiteRoute;
