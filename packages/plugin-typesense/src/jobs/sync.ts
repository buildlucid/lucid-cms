import { copy, defineJob, z } from "@lucidcms/core";
import syncIndex from "../services/sync-index.js";
import type { ResolvedOptions } from "../types.js";
import type { SyncJob } from "./types.js";

/** Starts sync after changes. Reconciliation handles retries and failure notifications. */
const createSyncJob = (options: ResolvedOptions): SyncJob => {
	const job: SyncJob = defineJob({
		name: "typesense:sync",
		version: 1,
		input: z.object({ index: z.string() }),
		retry: { type: "none" },
		notifyOnFailure: false,
		handler: async ({ context, input, execution, toolkit }) => {
			const index = options.indexes.find((index) => index.key === input.index);
			if (!index)
				return {
					error: { message: copy("server:plugin.typesense.index.missing") },
					data: undefined,
				};

			return syncIndex(context, { options, index, job, execution, toolkit });
		},
		describe: ({ input }) => ({ index: input.index }),
	});
	return job;
};

export default createSyncJob;
