import { getSiteUrl, getSiteUrls } from "@lucidcms/core/extension";
import type { ResolvedLucidConfig } from "@lucidcms/core/types";

/** The site's URLs, from the config's `siteUrl` resolved against the CMS's `url`, never a request's host. */
export type SiteUrls = {
	/** The default locale's site URL, for pages without a locale, `x-default` and reads that name no origin. */
	url: URL;
	/** Each content locale's site URL, keyed by locale code. */
	locales: Record<string, string>;
	/** The origin of every configured site URL, default first. Pages must be on one, and each has its own sitemap and robots.txt. */
	origins: ReadonlySet<string>;
	/** A locale's site URL, or the default locale's for pages without a locale or a URL of their own. */
	forLocale: (locale: string | null | undefined) => string;
};

/** Resolves the site's URL for each locale, as a domain per language gives each its own. Null when no site is configured. */
const resolveSiteUrls = (
	config: Pick<ResolvedLucidConfig, "url" | "siteUrl" | "localization">,
): SiteUrls | null => {
	const url = getSiteUrl(config);
	if (url === null) return null;

	const locales = getSiteUrls(config);
	return {
		url: new URL(url),
		locales,
		origins: new Set(
			[url, ...Object.values(locales)].map((href) => new URL(href).origin),
		),
		forLocale: (locale) => (locale ? locales[locale] : undefined) ?? url,
	};
};

export default resolveSiteUrls;
