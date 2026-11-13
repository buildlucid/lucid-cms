import type { HttpExtensionRegister } from "@lucidcms/core/types";
import resolveSiteUrls from "../services/resolve-site-urls.js";

/**
 * Serves IndexNow's key file, `/<key>.txt` with the key as its body, on the CMS, only when one of
 * the final config's site URLs is on the CMS's own origin. Search engines fetch it to check sends.
 */
const registerIndexNowKeyFile =
	(key: string): HttpExtensionRegister =>
	(app, config) => {
		const siteUrls = resolveSiteUrls(config);
		if (!siteUrls?.origins.has(new URL(config.url).origin)) return;

		app.get(`/${key}.txt`, (hono) => {
			hono.header("Content-Type", "text/plain; charset=utf-8");
			return hono.body(key, 200);
		});
	};

export default registerIndexNowKeyFile;
