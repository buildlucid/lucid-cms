import type { LucidHonoContext } from "@lucidcms/core/types";
import { getCookie } from "hono/cookie";
import type { Site } from "../site/create-site-loader.js";

/** Chooses a request's locale with the site's `locale` option, returning the headers it read for `Vary`. */
const readRequestLocale = (
	hono: LucidHonoContext,
	site: Site,
	path: string,
): { locale: string; vary: string[] } => {
	const vary = new Set<string>();
	const locale = site.config.resolveLocale({
		path,
		url: new URL(hono.req.url),
		header: (name) => {
			vary.add(name);
			return hono.req.header(name) ?? null;
		},
		cookie: (name) => {
			vary.add("Cookie");
			return getCookie(hono, name);
		},
	});
	return { locale, vary: [...vary] };
};

export default readRequestLocale;
