import getSiteUrl, { type SiteUrlConfig } from "./get-site-url.js";

/**
 * Every content locale's website URL, keyed by locale code, as `getSiteUrl` resolves each. Empty
 * when no website or no content locales are configured.
 */
const getSiteUrls = (config: SiteUrlConfig): Record<string, string> =>
	Object.fromEntries(
		config.localization.locales.flatMap(({ code }) => {
			const url = getSiteUrl(config, code);
			return url === null ? [] : [[code, url]];
		}),
	);

export default getSiteUrls;
