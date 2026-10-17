import { defineMiddleware, logger } from "@lucidcms/core";
import type {
	HttpExtensionRegister,
	ServiceContext,
} from "@lucidcms/core/types";
import { findRoute } from "rou3";
import { ISLANDS_URL, PLUGIN_KEY, storeKeys } from "../constants.js";
import { pageMarkup } from "../engine/page-markup.js";
import { SiteNotFoundError } from "../errors.js";
import type { SitePluginOptions, SiteState } from "../types.js";
import decode from "../utils/decode.js";
import getRouteParams from "../utils/get-route-params.js";
import createSiteLoader from "./create-site-loader.js";
import createSiteMarkup from "./create-site-markup.js";
import readPreview from "./read-preview.js";
import readStoredPage from "./read-stored-page.js";
import renderIsland from "./render-island.js";
import renderPage from "./render-page.js";
import renderStoredPage from "./render-stored-page.js";
import respondToRenderError from "./respond-to-render-error.js";

const normalizePath = (path: string) =>
	path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;

/** Lucid's server endpoints and the admin app, which the site never renders. */
const isLucidPath = (path: string) =>
	["/lucid", "/admin"].some(
		(prefix) => path === prefix || path.startsWith(`${prefix}/`),
	);

const canStorePages = (context: ServiceContext) => {
	if (context.kv.key !== "passthrough") return true;

	logger.warn({
		scope: PLUGIN_KEY,
		event: "plugin-site.isr.no-kv",
		dedupeKey: `${PLUGIN_KEY}:isr-no-kv`,
		message:
			"ISR pages need a KV adapter to be stored, so they render on every request. Add a KV plugin, such as @lucidcms/plugin-sqlite-kv.",
	});
	return false;
};

const registerSiteRoute =
	(options: SitePluginOptions): HttpExtensionRegister =>
	(app, config) => {
		const getSite = createSiteLoader(options, config);

		app.get(
			`${ISLANDS_URL}:id`,
			defineMiddleware(async ({ hono, toolkit, context }) => {
				const development = context.runtimeContext?.compiled === false;
				const site = await getSite({ reload: development, context });
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

		app.get(
			"/*",
			defineMiddleware(async ({ hono, toolkit, context, next }) => {
				const { pathname } = new URL(hono.req.url);
				const path = normalizePath(decode(pathname));
				if (isLucidPath(path)) {
					await next();
					return;
				}

				const previewResult = await readPreview({ hono, toolkit });
				if ("response" in previewResult) return previewResult.response;
				const { preview } = previewResult;

				const development = context.runtimeContext?.compiled === false;
				const site = await getSite({ reload: development, context });
				const state: SiteState = {
					toolkit,
					path,
					preview,
					version: site.functions.getVersion,
				};
				pageMarkup.set(state, {
					...(await createSiteMarkup({ hono, toolkit, preview })),
					footerWritten: false,
				});

				try {
					const match = findRoute(site.router, "GET", pathname);
					if (!match) throw new SiteNotFoundError();

					if (!preview && match.data.mode === "isr" && canStorePages(context)) {
						const stored =
							(await readStoredPage(
								context,
								storeKeys.page(site.version, path),
							)) ??
							(await renderStoredPage({
								context,
								site,
								page: match.data,
								params: getRouteParams(match),
								state,
							}));
						return hono.body(stored.body, 200, {
							"content-type": stored.contentType,
						});
					}

					return await renderPage({ hono, site, match, state });
				} catch (error) {
					const response = await respondToRenderError({
						hono,
						site,
						state,
						error,
						development,
					});
					if (response) return response;
					await next();
				}
			}),
		);
	};

export default registerSiteRoute;
