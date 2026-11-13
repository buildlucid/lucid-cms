import type { ResolvedLucidConfig } from "@lucidcms/core/types";
import type { SitePluginOptionsInternal } from "../types.js";
import createSiteLoader from "./create-site-loader.js";

/** Loads the site for requests: the same `getSite` from `createSiteLoader`, made for the final config. */
type SiteLoader = ReturnType<typeof createSiteLoader>;

/**
 * Hands out one site loader per final config, so the page routes and the sitemap hook load the
 * site once between them.
 */
const shareSiteLoader = (options: SitePluginOptionsInternal) => {
	let shared: { config: ResolvedLucidConfig; load: SiteLoader } | undefined;

	return (config: ResolvedLucidConfig): SiteLoader => {
		if (shared?.config !== config) {
			shared = { config, load: createSiteLoader(options, config) };
		}
		return shared.load;
	};
};

export default shareSiteLoader;
