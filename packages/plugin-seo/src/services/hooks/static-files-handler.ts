import { LucidError } from "@lucidcms/core";
import type { LucidHook, TransformHookEvent } from "@lucidcms/core/types";
import { sitemap } from "../../constants.js";
import type { SeoPluginOptionsInternal } from "../parse-plugin-options.js";
import getRobots from "../robots/get-robots.js";
import buildSitemapIndexXml from "../sitemap/build-sitemap-index-xml.js";
import buildSitemapXml from "../sitemap/build-sitemap-xml.js";
import getSitemap from "../sitemap/get-sitemap.js";

/**
 * Mirrors the `site.staticFiles` event of `@lucidcms/site`, whose types can't be imported here:
 * the site plugin imports this plugin's types, and the build refuses packages that depend on each
 * other. Keep it in step with the site's `hook-events`. Internal, so it never reaches this
 * package's published types.
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
 * Writes the sitemap, `/sitemap.xml` and every file it lists, and `/robots.txt` into the site
 * plugin's static builds, each while it is on, for the environment the site builds. A static build
 * is one folder, so both are the default locale's origin's, even when a `locale` option puts other
 * locales on their own domains. A sitemap without pages writes no files, and robots.txt then has
 * no `Sitemap:` line. A failure fails the build instead of writing an empty sitemap.
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
	};

export default staticFilesHandler;
