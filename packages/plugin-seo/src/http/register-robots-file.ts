import { defineMiddleware, LucidError } from "@lucidcms/core";
import type { HttpExtensionRegister } from "@lucidcms/core/types";
import matchRequestOrigin from "../services/match-request-origin.js";
import type { SeoPluginOptionsInternal } from "../services/parse-plugin-options.js";
import resolveSiteUrls from "../services/resolve-site-urls.js";
import createRobotsToolkit from "../toolkit/robots/index.js";

/**
 * Serves `/robots.txt` on the CMS, only when one of the final config's site URLs is on the CMS's
 * own origin, so it never answers for a site hosted elsewhere. Each request gets the robots.txt
 * of the site origin its host matches, as `matchRequestOrigin` picks it.
 */
const registerRobotsFile =
	(options: SeoPluginOptionsInternal): HttpExtensionRegister =>
	(app, config) => {
		const siteUrls = resolveSiteUrls(config);
		if (!siteUrls?.origins.has(new URL(config.url).origin)) return;

		app.get(
			"/robots.txt",
			defineMiddleware(async ({ hono, context }) => {
				const text = await createRobotsToolkit(context, options).text({
					origin: matchRequestOrigin(siteUrls, hono.req.url),
				});
				if (text.error) throw new LucidError(text.error);

				hono.header("Content-Type", "text/plain; charset=utf-8");
				return hono.body(text.data, 200);
			}),
		);
	};

export default registerRobotsFile;
