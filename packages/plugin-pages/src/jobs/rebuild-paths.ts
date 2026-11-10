import { defineJob, z, LucidError } from "@lucidcms/core";
import type { JobDefinition } from "@lucidcms/core/types";
import rebuildPaths from "../services/rebuild-paths.js";
import type { PluginOptionsInternal } from "../types/types.js";

export type RebuildPathsJob = JobDefinition<"pages:rebuild-paths", null>;

/**
 * Rebuilds paths in one transaction. Conflicts roll back all changes and require manual slug
 * correction before retrying.
 */
const createRebuildPathsJob = (
	options: PluginOptionsInternal,
): RebuildPathsJob =>
	defineJob({
		key: "pages:rebuild-paths",
		version: 1,
		input: z.null(),
		transaction: true,
		retry: { type: "none" },
		handler: async ({ context, toolkit }) => {
			const result = await rebuildPaths(context, { options, toolkit });
			if (result.error) throw new LucidError(result.error);
			return result.data;
		},
	});

export default createRebuildPathsJob;
