import { defineJob, definePlugin, defineSeed, z } from "@lucidcms/core";
import type { LucidPlugin } from "@lucidcms/core/types";
import {
	recordRun,
	SEED_RECORDS_MIGRATION,
	seedRecordsMigration,
} from "./records.ts";

/** The seed the plugin registers, as plugins add theirs. */
export const PLUGIN_SEED = "harness-seeds:plugin";

/** Counts a run under the name it is given, so a seed can show that jobs it queues run. */
export const recordJob = defineJob({
	key: "harness-seeds:record",
	version: 1,
	input: z.object({ name: z.string().min(1) }),
	handler: async ({ context, input }) => {
		await recordRun(context, input.name);
	},
});

/** Owns the records table, the job seeds queue and a seed of its own. */
const seedsPlugin: LucidPlugin = () =>
	definePlugin({
		key: "harness-seeds",
		configure: (draft) => {
			draft.migrations.push({
				name: SEED_RECORDS_MIGRATION,
				migration: seedRecordsMigration,
			});
			draft.jobs.push(recordJob);
			draft.seeds.push({
				name: PLUGIN_SEED,
				seed: defineSeed({
					run: ({ context }) => recordRun(context, PLUGIN_SEED),
				}),
			});
		},
	});

export default seedsPlugin;
