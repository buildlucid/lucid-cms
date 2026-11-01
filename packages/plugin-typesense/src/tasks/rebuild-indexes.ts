import { definePluginTask, z } from "@lucidcms/core";
import type { SyncJob } from "../jobs/types.js";
import getStatus from "../toolkit/get-status/index.js";
import rebuild from "../toolkit/rebuild/index.js";
import type { ResolvedOptions } from "../types.js";
import indexFailure from "./index-failure.js";
import type { IndexTaskResult } from "./types.js";

/** Rebuilds indexes sequentially. Inline jobs finish before each status is read. */
const rebuildIndexes = (options: ResolvedOptions, job: SyncJob) =>
	definePluginTask({
		input: z.object({}),
		run: async ({ context, toolkit }) => {
			const results: IndexTaskResult[] = [];
			for (const { key } of options.indexes) {
				const rebuilt = await rebuild(
					context,
					{ index: key },
					{ options, job, toolkit },
				);
				if (rebuilt.error) {
					results.push(indexFailure(context, key, rebuilt.error));
					continue;
				}

				const status = await getStatus(context, { index: key }, options);
				results.push(
					status.error
						? indexFailure(context, key, status.error)
						: { index: key, status: status.data, error: null },
				);
			}
			return results;
		},
	});

export type RebuildIndexesTask = ReturnType<typeof rebuildIndexes>;

export default rebuildIndexes;
