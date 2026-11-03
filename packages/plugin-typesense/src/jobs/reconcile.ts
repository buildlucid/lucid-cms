import { copy, defineJob, z } from "@lucidcms/core";
import syncIndex from "../services/sync-index.js";
import type { ResolvedOptions } from "../types.js";
import type { SyncJob } from "./types.js";

/**
 * Reconciles indexes every minute. Pending retries block later occurrences, enforcing the retry
 * backoff.
 */
const createReconcileJob = (options: ResolvedOptions, sync: SyncJob) =>
	defineJob({
		name: "typesense:reconcile",
		version: 1,
		input: z.object({ index: z.string() }),
		retry: {
			type: "exponential",
			maxAttempts: 8,
			baseDelayMs: 60_000,
			maxDelayMs: 30 * 60_000,
			jitter: "none",
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

			return syncIndex(context, {
				options,
				index,
				job: sync,
				execution,
				toolkit,
			});
		},
		describe: ({ input }) => ({ index: input.index }),
	});

export default createReconcileJob;
