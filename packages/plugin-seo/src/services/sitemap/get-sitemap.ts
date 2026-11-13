import { copy } from "@lucidcms/core";
import type { ServiceFn } from "@lucidcms/core/types";
import hookEvents, {
	type SeoSitemapEntriesHookMeta,
} from "../../hook-events/index.js";
import type { SitemapEntry, SitemapReadInput } from "../../types.js";
import type { SeoPluginOptionsInternal } from "../parse-plugin-options.js";
import resolveSiteOrigin from "../resolve-site-origin.js";
import resolveSiteUrls from "../resolve-site-urls.js";
import applyTrailingSlash from "./apply-trailing-slash.js";
import completeEntries from "./complete-entries.js";
import getDocumentEntries from "./get-document-entries.js";
import getListedVersion from "./get-listed-version.js";
import resolveSitemapEnvironment from "./resolve-sitemap-environment.js";
import resolveSitemapTargets from "./resolve-sitemap-targets.js";
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

	const targetsRes = resolveSitemapTargets(context.config, options);
	if (targetsRes.error) return targetsRes;
	const environmentRes = resolveSitemapEnvironment(
		context.config.collections,
		input.environment ?? options.sitemap.environment,
	);
	if (environmentRes.error) return environmentRes;
	const environment = environmentRes.data;

	//* concat rather than push(...), which runs out of stack on large collections
	let entries: SitemapEntry[] = [];
	let excluded: SeoSitemapEntriesHookMeta["excluded"] = [];
	for (const target of targetsRes.data) {
		const version = getListedVersion(target.collection, environment);
		if (version === null) continue;

		const entriesRes = await getDocumentEntries(context, {
			target,
			version,
			siteUrls,
		});
		if (entriesRes.error) return entriesRes;
		entries = entries.concat(entriesRes.data.entries);
		excluded = excluded.concat(entriesRes.data.excluded);
	}

	const hookRes = await hookEvents.execute(context, "sitemapEntries", {
		meta: {
			environment,
			siteUrl: siteUrls.url.href,
			siteUrls: siteUrls.locales,
			excluded,
		},
		data: { entries },
	});
	if (hookRes.error) return hookRes;

	const completedRes = completeEntries(hookRes.data.entries, siteUrls);
	if (completedRes.error) return completedRes;

	return splitFiles(
		applyTrailingSlash(
			completedRes.data.filter((entry) => new URL(entry.url).origin === origin),
			input.trailingSlash,
		),
		origin,
	);
};

export default getSitemap;
