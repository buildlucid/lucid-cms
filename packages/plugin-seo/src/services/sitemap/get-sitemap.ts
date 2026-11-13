import { copy } from "@lucidcms/core";
import type { ServiceFn } from "@lucidcms/core/types";
import type { SitemapReadInput } from "../../types.js";
import type { SeoPluginOptionsInternal } from "../parse-plugin-options.js";
import resolveSiteOrigin from "../resolve-site-origin.js";
import resolveSiteUrls from "../resolve-site-urls.js";
import applyTrailingSlash from "./apply-trailing-slash.js";
import getSitemapEntries from "./get-sitemap-entries.js";
import splitFiles, { type SitemapFileGroup } from "./split-files.js";

/**
 * Builds document entries, runs hooks across all origins, then filters to the requested origin and
 * splits files. Preserves cross-origin language links. Returns errors instead of partial sitemaps.
 */
const getSitemap: ServiceFn<
	[{ options: SeoPluginOptionsInternal; input: SitemapReadInput }],
	SitemapFileGroup[]
> = async (context, data) => {
	const { options, input } = data;
	if (options.sitemap === false) {
		return {
			error: {
				type: "basic",
				status: 404,
				message: copy("server:plugin.seo.sitemap.disabled"),
			},
			data: undefined,
		};
	}

	const siteUrls = resolveSiteUrls(context.config);
	if (!siteUrls) {
		return {
			error: {
				type: "basic",
				status: 500,
				message: copy("server:plugin.seo.sitemap.site.url.missing"),
			},
			data: undefined,
		};
	}
	const originRes = resolveSiteOrigin(siteUrls, input.origin);
	if (originRes.error) return originRes;
	const origin = originRes.data;

	const entriesRes = await getSitemapEntries(context, {
		options,
		siteUrls,
		environment: input.environment ?? options.sitemap.environment,
	});
	if (entriesRes.error) return entriesRes;

	return splitFiles(
		applyTrailingSlash(
			entriesRes.data.filter((entry) => new URL(entry.url).origin === origin),
			input.trailingSlash,
		),
		origin,
	);
};

export default getSitemap;
