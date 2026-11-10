import type { LucidPluginCommand } from "@lucidcms/core/types";
import type { ClearCacheTask } from "../tasks/clear-cache.js";
import type { SitePluginOptionsInternal } from "../types.js";

/** Runs `site:clear-cache`, making stored ISR pages and fragments render afresh on their next request. */
const clearCache = async (
	options: SitePluginOptionsInternal,
	{ runTask, logger }: Parameters<LucidPluginCommand["run"]>[0],
) => {
	if (options.mode === "static") {
		logger.warn(
			"Static sites are served from the files site:build writes, so there's no stored cache to clear. Run site:build to update them.",
		);
		return;
	}

	const { adapter } = await runTask<ClearCacheTask>("clear-cache", {});
	if (adapter === "passthrough") {
		logger.warn(
			"No KV adapter is configured, so no pages were stored. Add a KV plugin, such as @lucidcms/sqlite-kv, to store ISR pages.",
		);
		return;
	}

	logger.info(
		"Stored pages and fragments will render afresh on their next request. CDN caches keep their copies until they expire.",
	);
};

export default clearCache;
