import type { LucidHook } from "@lucidcms/core/types";
// Types only, for the optional hook: the SEO plugin may not be installed.
import type {} from "@lucidcms/seo";
import { findRoute } from "rou3";
import type shareSiteLoader from "../site/share-site-loader.js";
import type { SitePluginOptionsInternal } from "../types.js";
import routeKey from "../utils/route-key.js";
import dropEntries from "./helpers/drop-entries.js";
import { type SiteUrlFor, slashPath, slashUrl } from "./helpers/entry-urls.js";
import listTemplatePages from "./helpers/list-template-pages.js";

/**
 * Adds template pages, applies trailing slashes and removes excluded pages and unsupported
 * locales. Explicit opt-ins evaluate `paths` on each build. Leaves other environments unchanged
 * and resolves URLs per locale domain.
 */
const sitemapEntriesHandler =
	(
		options: SitePluginOptionsInternal,
		siteLoader: ReturnType<typeof shareSiteLoader>,
	): LucidHook<"seo", "sitemapEntries">["handler"] =>
	async ({ meta, data, context, toolkit }) => {
		const site = await siteLoader(context.config)({ context });
		if (meta.environment !== site.config.environment) return;

		const siteUrl: SiteUrlFor = (locale) =>
			(locale ? meta.siteUrls[locale] : undefined) ?? meta.siteUrl;
		const kept = dropEntries(data.entries, {
			locales: new Set(
				context.config.localization.locales
					.map((locale) => locale.code)
					.filter((code) => !site.config.locales.has(code)),
			),
			siteUrl,
			trailingSlash: options.trailingSlash,
			drop: (entry) =>
				findRoute(site.router, "GET", routeKey(entry.path))?.data.sitemap ===
				false,
		});
		// Concatenated, as a large site's pages are too many to spread into one call.
		const entries = kept.concat(
			await listTemplatePages({
				site,
				entries: kept,
				excluded: meta.excluded,
				state: {
					toolkit,
					context,
					path: "",
					preview: null,
					version: site.config.getVersion,
				},
				siteUrl,
				defaultLocale: context.config.localization.defaultLocale,
			}),
		);

		for (const entry of entries) {
			entry.path = slashPath(entry.path, options.trailingSlash);
			if (entry.url !== undefined) {
				entry.url = slashUrl(entry.url, options.trailingSlash);
			}
			for (const alternate of entry.alternates ?? []) {
				alternate.url = slashUrl(alternate.url, options.trailingSlash);
			}
		}
		data.entries = entries;
	};

export default sitemapEntriesHandler;
