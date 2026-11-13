import { defineJob, LucidError, z } from "@lucidcms/core";
import type { JobDefinition } from "@lucidcms/core/types";
import sendChanges from "../services/index-now/send-changes.js";
import type { SeoPluginOptionsInternal } from "../services/parse-plugin-options.js";

export type SendIndexNowJob = JobDefinition<"seo:index-now-send", null>;

/**
 * Marks changes before sending pending URLs. Runs without a job transaction so marks and accepted
 * batches survive later failures and retries.
 */
const createSendIndexNowJob = (
	options: SeoPluginOptionsInternal,
): SendIndexNowJob =>
	defineJob({
		key: "seo:index-now-send",
		version: 1,
		input: z.null(),
		handler: async ({ context }) => {
			if (!options.indexNow) return;
			const result = await sendChanges(context, {
				options,
				indexNow: options.indexNow,
			});
			if (result.error) throw new LucidError(result.error);
		},
	});

export default createSendIndexNowJob;
