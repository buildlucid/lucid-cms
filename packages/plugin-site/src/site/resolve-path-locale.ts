import type { SiteConfig } from "./create-site-config.js";

/**
 * The locale a path renders in without a request, as static builds and the sitemap see it: the
 * `locale` option gets the path and, when given, the URL it is served at, but no headers or
 * cookies. Without a URL the path is on the default locale's domain.
 */
const resolvePathLocale = (
	config: SiteConfig,
	path: string,
	url: URL | null = null,
) =>
	config.resolveLocale({
		path,
		url,
		header: () => null,
		cookie: () => undefined,
	});

export default resolvePathLocale;
