import { LucidError } from "@lucidcms/core";
import type { LucidHook, TransformHookEvent } from "@lucidcms/core/types";
import { sitemap } from "../../constants.js";
import type { SeoPluginOptionsInternal } from "../parse-plugin-options.js";
import getRobots from "../robots/get-robots.js";
import buildSitemapIndexXml from "../sitemap/build-sitemap-index-xml.js";
import buildSitemapXml from "../sitemap/build-sitemap-xml.js";
import getSitemap from "../sitemap/get-sitemap.js";

/**
 * Mirrors `site.staticFiles` internally to avoid a circular package dependency. Keep in sync with
 * the site plugin's `hook-events`; excluded from published types.
 */
declare module "@lucidcms/core/types" {
	interface PluginHookEvents {
		site: {
			staticFiles: TransformHookEvent<
				{ environment: string },
				{ files: Array<{ path: string; body: string }> }
			>;
		};
	}
}

/**
 * Writes enabled sitemap, robots and IndexNow key files for static builds in the build
 * environment. Uses the default locale's origin. Empty sitemaps produce no files or robots sitemap
 * link. Errors fail the build.
 */
const staticFilesHandler =
	(
		options: SeoPluginOptionsInternal,
	): LucidHook<"site", "staticFiles">["handler"] =>
	async ({ meta, data, context }) => {
		let hasSitemap = false;
		if (options.sitemap !== false) {
			//* built once for every file, rather than once a file through the toolkit
			const sitemapRes = await getSitemap(context, {
				options,
				input: { environment: meta.environment },
			});
			if (sitemapRes.error) throw new LucidError(sitemapRes.error);

			//* a sitemap index must list a file, so a site without pages gets none
			hasSitemap = sitemapRes.data.length > 0;
			if (hasSitemap) {
				data.files.push(
					{
						path: sitemap.indexPath,
						body: buildSitemapIndexXml(
							sitemapRes.data.map((group) => group.file),
						),
					},
					...sitemapRes.data.map((group) => ({
						path: group.file.path,
						body: buildSitemapXml(group.urls),
					})),
				);
			}
		}

		if (options.robots !== false) {
			//* no `Sitemap:` line for a sitemap that wasn't written
			const robotsRes = await getRobots(context, {
				options: hasSitemap ? options : { ...options, sitemap: false },
				input: {},
			});
			if (robotsRes.error) throw new LucidError(robotsRes.error);
			data.files.push({ path: "/robots.txt", body: robotsRes.data });
		}

		if (options.indexNow) {
			data.files.push({
				path: `/${options.indexNow.key}.txt`,
				body: options.indexNow.key,
			});
		}
	};

export default staticFilesHandler;
