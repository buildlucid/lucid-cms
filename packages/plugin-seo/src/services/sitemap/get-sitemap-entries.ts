import type { ServiceFn } from "@lucidcms/core/types";
import hookEvents, {
	type SeoSitemapEntriesHookMeta,
} from "../../hook-events/index.js";
import type { SitemapEntry } from "../../types.js";
import type { SeoPluginOptionsInternal } from "../parse-plugin-options.js";
import type { SiteUrls } from "../resolve-site-urls.js";
import completeEntries from "./complete-entries.js";
import getDocumentEntries from "./get-document-entries.js";
import getListedVersion from "./get-listed-version.js";
import resolveSitemapEnvironment from "./resolve-sitemap-environment.js";
import resolveSitemapTargets from "./resolve-sitemap-targets.js";

/**
 * Lists every site origin's sitemap entries: published documents, then `seo.sitemapEntries` hooks,
 * then validated and completed. The sitemap keeps one origin's; IndexNow sends them all.
 */
const getSitemapEntries: ServiceFn<
	[
		{
			options: SeoPluginOptionsInternal;
			siteUrls: SiteUrls;
			/** Defaults to the one `resolveSitemapEnvironment` picks. */
			environment: string | undefined;
		},
	],
	SitemapEntry[]
> = async (context, data) => {
	const { options, siteUrls } = data;

	const targetsRes = resolveSitemapTargets(context.config, options);
	if (targetsRes.error) return targetsRes;
	const environmentRes = resolveSitemapEnvironment(
		context.config.collections,
		data.environment,
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

	return completeEntries(hookRes.data.entries, siteUrls);
};

export default getSitemapEntries;
