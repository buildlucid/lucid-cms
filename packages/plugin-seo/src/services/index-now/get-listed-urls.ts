import { copy } from "@lucidcms/core";
import type { ServiceFn } from "@lucidcms/core/types";
import type { SeoPluginOptionsInternal } from "../parse-plugin-options.js";
import resolveSiteUrls from "../resolve-site-urls.js";
import getSitemapEntries from "../sitemap/get-sitemap-entries.js";

/**
 * Every page the sitemap lists on every site origin, in its environment, keyed by URL with its
 * `lastModified`. Hook entries are included, so IndexNow sends exactly what the sitemaps list. A URL
 * listed more than once keeps its newest date.
 */
const getListedUrls: ServiceFn<
	[{ options: SeoPluginOptionsInternal }],
	Map<string, string | null>
> = async (context, data) => {
	const { options } = data;
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

	const entriesRes = await getSitemapEntries(context, {
		options,
		siteUrls,
		environment: options.sitemap.environment,
	});
	if (entriesRes.error) return entriesRes;

	//* a URL listed twice keeps its newest known date, whatever order the entries come in
	const listed = new Map<string, string | null>();
	for (const entry of entriesRes.data) {
		const known = listed.get(entry.url) ?? null;
		const newer =
			known === null ||
			(entry.lastModified !== null &&
				Date.parse(entry.lastModified) > Date.parse(known));
		listed.set(entry.url, newer ? entry.lastModified : known);
	}

	return { error: undefined, data: listed };
};

export default getListedUrls;
