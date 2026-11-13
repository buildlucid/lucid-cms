import type { ResolvedLucidConfig } from "../../types/config.js";

/** The config values a website's URL is resolved from. */
export type SiteUrlConfig = Pick<
	ResolvedLucidConfig,
	"url" | "siteUrl" | "localization"
>;

/**
 * Resolves the website's URL for a content locale against the CMS's `url`: the locale's own
 * `siteUrl` entry, or the default locale's when it has none or no locale is given. Null when no
 * website is configured.
 */
const getSiteUrl = (
	config: SiteUrlConfig,
	locale?: string | null,
): string | null => {
	const { siteUrl } = config;
	if (siteUrl === undefined) return null;

	const { defaultLocale } = config.localization;
	const value =
		typeof siteUrl === "string"
			? siteUrl
			: ((locale ? siteUrl[locale] : undefined) ??
				(defaultLocale === null ? undefined : siteUrl[defaultLocale]));
	if (value === undefined) return null;

	return new URL(value, config.url).toString();
};

export default getSiteUrl;
