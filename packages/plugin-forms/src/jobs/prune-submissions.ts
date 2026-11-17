import { defineJob, LucidError, z } from "@lucidcms/core";
import type { JobDefinition } from "@lucidcms/core/types";
import { PLUGIN_KEY } from "../constants.js";
import type {
	FormsPluginOptionsInternal,
	FormsSubmissionsOptionsInternal,
} from "../services/parse-plugin-options.js";
import pruneSubmissions from "../services/submissions/prune-submissions.js";

export type PruneSubmissionsJob = JobDefinition<
	"forms:prune-submissions",
	null
>;

/**
 * Deletes submissions older than their form keeps them, once a day. Runs without a job
 * transaction, so what one run deleted stays deleted if a later page fails.
 */
const createPruneSubmissionsJob = (
	options: FormsPluginOptionsInternal,
	submissions: FormsSubmissionsOptionsInternal,
): PruneSubmissionsJob =>
	defineJob({
		key: "forms:prune-submissions",
		version: 1,
		input: z.null(),
		schedules: [{ key: "daily", cron: "0 3 * * *", input: null }],
		handler: async ({ context }) => {
			const result = await pruneSubmissions(context, { options, submissions });
			if (result.error) throw new LucidError(result.error);
			//* fails the job, so what was left behind shows up rather than passing quietly
			if (result.data.failed > 0) {
				throw new LucidError({
					scope: PLUGIN_KEY,
					message: `${result.data.failed} expired form submissions couldn't be deleted.`,
				});
			}
		},
	});

export default createPruneSubmissionsJob;
