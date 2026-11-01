import { definePluginTask, z } from "@lucidcms/core";
import { invalidateCacheTags } from "@lucidcms/core/extension";
import { STORE_CACHE_TAG } from "../constants.js";

/** Rotates the shared cache tag to invalidate stored pages and fragments. */
const clearCache = definePluginTask({
	input: z.object({}),
	run: async ({ context }) => {
		await invalidateCacheTags(context, [STORE_CACHE_TAG]);
		return { adapter: context.kv.key };
	},
});

export type ClearCacheTask = typeof clearCache;

export default clearCache;
