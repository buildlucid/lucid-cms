import { copy } from "@lucidcms/core";
import { runToolkitService } from "@lucidcms/core/toolkit";
import type { CoreToolkit } from "@lucidcms/core/types";
import type { SendIndexNowJob } from "../../jobs/send-index-now.js";
import type { SeoPluginOptionsInternal } from "../../services/parse-plugin-options.js";

/** IndexNow sends for `toolkit.seo.indexNow`. */
const createIndexNowToolkit = (
	core: CoreToolkit,
	options: SeoPluginOptionsInternal,
	job: SendIndexNowJob,
) => ({
	/**
	 * Queues a send of the sitemap's pages that are new, changed or gone, and any still pending from
	 * earlier sends, such as after a deploy that doesn't report back. With none, it sends nothing.
	 *
	 * @example
	 * ```ts
	 * const queued = await toolkit.seo.indexNow.send();
	 * ```
	 */
	send: () =>
		runToolkitService({
			handler: async () => {
				if (!options.indexNow) {
					return {
						error: {
							type: "basic",
							status: 404,
							message: copy("server:plugin.seo.index.now.disabled"),
						},
						data: undefined,
					};
				}
				return core.jobs.enqueueJob({ job, payload: null });
			},
			name: { key: "plugin.seo.toolkit.index.now.error.name" },
			message: { key: "plugin.seo.toolkit.index.now.error.message" },
		}),
});

export default createIndexNowToolkit;
