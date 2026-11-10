import { defineJob, z } from "@lucidcms/core";
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
		name: "pages:clear-path-history",
		version: 1,
		input: z.null(),
		transaction: true,
		retry: { type: "none" },
		handler: ({ context }) => clearPathHistory(context, { options }),
	});

export default createClearPathHistoryJob;
