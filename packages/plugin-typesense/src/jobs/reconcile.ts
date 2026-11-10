import { copy, defineJob, z, LucidError } from "@lucidcms/core";
import syncIndex from "../services/sync-index.js";
import type { ResolvedOptions } from "../types.js";
import type { SyncJob } from "./types.js";

/**
 * Reconciles indexes every minute. Pending retries block later occurrences, enforcing the retry
 * backoff.
 */
const createReconcileJob = (options: ResolvedOptions, sync: SyncJob) =>
	defineJob({
		key: "typesense:reconcile",
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
			key: index.key,
			cron: "* * * * *",
			input: { index: index.key },
			overlap: "skip",
			missed: "run-once",
		})),
		handler: async ({ context, input, execution, toolkit }) => {
			const index = options.indexes.find((index) => index.key === input.index);
			if (!index)
				throw new LucidError({
					message: copy("server:plugin.typesense.index.missing"),
				});

			const result = await syncIndex(context, {
				options,
				index,
				job: sync,
				execution,
				toolkit,
			});
			if (result.error) throw new LucidError(result.error);
			return;
		},
		describe: ({ input }) => ({ index: input.index }),
	});

export default createReconcileJob;
