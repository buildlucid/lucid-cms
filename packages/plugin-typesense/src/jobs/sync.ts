import { copy, defineJob, z, LucidError } from "@lucidcms/core";
import syncIndex from "../services/sync-index.js";
import type { ResolvedOptions } from "../types.js";
import type { SyncJob } from "./types.js";

/** Starts sync after changes. Reconciliation handles retries and failure notifications. */
const createSyncJob = (options: ResolvedOptions): SyncJob => {
	const job: SyncJob = defineJob({
		key: "typesense:sync",
		version: 1,
		input: z.object({ index: z.string() }),
		retry: { type: "none" },
		notifyOnFailure: false,
		handler: async ({ context, input, execution, toolkit }) => {
			const index = options.indexes.find((index) => index.key === input.index);
			if (!index)
				throw new LucidError({
					message: copy("server:plugin.typesense.index.missing"),
				});

			const result = await syncIndex(context, {
				options,
				index,
				job,
				execution,
				toolkit,
			});
			if (result.error) throw new LucidError(result.error);
			return;
		},
		describe: ({ input }) => ({ index: input.index }),
	});
	return job;
};

export default createSyncJob;
