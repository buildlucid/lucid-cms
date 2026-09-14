import { copy, defineJob, z } from "@lucidcms/core";
import syncIndex from "../services/sync-index.js";
import type { ResolvedOptions } from "../types.js";
import type { SyncJob } from "./types.js";

const createSyncJob = (options: ResolvedOptions): SyncJob => {
	const job: SyncJob = defineJob({
		name: "typesense:sync",
		version: 1,
		input: z.object({ index: z.string() }),
		retry: {
			type: "exponential",
			maxAttempts: 5,
			baseDelayMs: 1000,
			maxDelayMs: 60_000,
			jitter: "full",
		},
		schedules: options.indexes.map((index) => ({
			name: index.key,
			cron: "* * * * *",
			input: { index: index.key },
			overlap: "skip",
			missed: "run-once",
		})),
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
