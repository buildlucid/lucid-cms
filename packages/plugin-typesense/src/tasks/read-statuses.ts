import { definePluginTask, z } from "@lucidcms/core";
import getStatus from "../toolkit/get-status/index.js";
import type { ResolvedOptions } from "../types.js";
import indexFailure from "./index-failure.js";
import type { IndexTaskResult } from "./types.js";

/** Reads every configured index's status for `typesense:status`. */
const readStatuses = (options: ResolvedOptions) =>
	definePluginTask({
		input: z.object({}),
		run: async ({ context }) => {
			const results: IndexTaskResult[] = [];
			for (const { key } of options.indexes) {
				const status = await getStatus(context, { index: key }, options);
				results.push(
					status.error
						? indexFailure(context, key, status.error)
						: { index: key, status: status.data, error: null },
				);
			}
			return results;
		},
	});

export type ReadStatusesTask = ReturnType<typeof readStatuses>;

export default readStatuses;
