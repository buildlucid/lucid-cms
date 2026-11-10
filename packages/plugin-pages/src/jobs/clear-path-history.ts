import { defineJob, z, LucidError } from "@lucidcms/core";
import type { JobDefinition } from "@lucidcms/core/types";
import clearPathHistory from "../services/clear-path-history.js";
import type { PluginOptionsInternal } from "../types/types.js";

export type ClearPathHistoryJob = JobDefinition<
	"pages:clear-path-history",
	null
>;

/** Clears path history in one transaction, so a failure keeps every old path redirecting. */
const createClearPathHistoryJob = (
	options: PluginOptionsInternal,
): ClearPathHistoryJob =>
	defineJob({
		key: "pages:clear-path-history",
		version: 1,
		input: z.null(),
		transaction: true,
		retry: { type: "none" },
		handler: async ({ context }) => {
			const result = await clearPathHistory(context, { options });
			if (result.error) throw new LucidError(result.error);
			return result.data;
		},
	});

export default createClearPathHistoryJob;
