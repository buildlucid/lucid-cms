import { LucidError } from "@lucidcms/core";
import type { LucidPluginCommand } from "@lucidcms/core/types";
import { PLUGIN_KEY } from "../constants.js";
import type { ReadStatusesTask } from "../tasks/read-statuses.js";
import describeStatus from "./describe-status.js";

const status: LucidPluginCommand["run"] = async ({ runTask, logger }) => {
	const results = await runTask<ReadStatusesTask>("status", {});

	let failures = 0;
	for (const result of results) {
		if (result.error !== null) {
			failures++;
			logger.warn(`"${result.index}" status couldn't be read`, [result.error]);
			continue;
		}
		if (result.status.lastError) {
			logger.warn(describeStatus(result.status), [result.status.lastError]);
			continue;
		}
		logger.info(describeStatus(result.status));
	}

	if (failures > 0) {
		throw new LucidError({
			scope: PLUGIN_KEY,
			message: `${failures} of ${results.length} Typesense index statuses couldn't be read.`,
		});
	}
};

export default status;
