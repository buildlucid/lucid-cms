import { defineToolkit } from "@lucidcms/core/toolkit";
import type { CoreToolkit, ToolkitContext } from "@lucidcms/core/types";
import type { SendIndexNowJob } from "../jobs/send-index-now.js";
import type { SeoPluginOptionsInternal } from "../services/parse-plugin-options.js";
import createIndexNowToolkit from "./index-now/index.js";
import createRobotsToolkit from "./robots/index.js";
import createSitemapToolkit from "./sitemap/index.js";

const createSeoToolkit = (
	context: ToolkitContext,
	core: CoreToolkit,
	options: SeoPluginOptionsInternal,
	job: SendIndexNowJob,
) => ({
	/** The sitemap's pages, files and XML. Calls return an error when `sitemap` is turned off. */
	sitemap: createSitemapToolkit(context, options),
	/** robots.txt for each site origin. Calls return an error when `robots` is turned off. */
	robots: createRobotsToolkit(context, options),
	/** Queues IndexNow sends. Calls return an error when `indexNow` isn't set. */
	indexNow: createIndexNowToolkit(core, options, job),
});

/** SEO helpers available on toolkit.seo when the SEO plugin is configured. */
export type SeoToolkit = ReturnType<typeof createSeoToolkit>;

declare module "@lucidcms/core/types" {
	interface ToolkitServices {
		seo: SeoToolkit;
	}
}

/** Adds `toolkit.seo`, bound to these plugin options and the IndexNow send job. */
const seoToolkit = (options: SeoPluginOptionsInternal, job: SendIndexNowJob) =>
	defineToolkit({
		key: "seo",
		create: ({ context, core }) =>
			createSeoToolkit(context, core, options, job),
	});

export default seoToolkit;
