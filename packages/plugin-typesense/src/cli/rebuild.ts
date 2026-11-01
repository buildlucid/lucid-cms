import { LucidError } from "@lucidcms/core";
import type { LucidPluginCommand } from "@lucidcms/core/types";
import { PLUGIN_KEY } from "../constants.js";
import type { RebuildIndexesTask } from "../tasks/rebuild-indexes.js";

/** Runs `typesense:rebuild`, rebuilding every index and failing if any didn't finish. */
const rebuild: LucidPluginCommand["run"] = async ({ runTask, logger }) => {
	const results = await runTask<RebuildIndexesTask>("rebuild", {});

	let failures = 0;
	for (const result of results) {
		if (result.error !== null) {
			failures++;
			logger.warn(`"${result.index}" couldn't be rebuilt`, [result.error]);
			continue;
		}
		if (result.status.rebuild?.status !== "complete") {
			failures++;
			logger.warn(`"${result.index}" didn't finish rebuilding`, [
				result.status.lastError ??
					"The rebuild will carry on when the index's worker next runs.",
			]);
			continue;
		}
		logger.info(
			`Rebuilt "${result.index}" with ${result.status.rebuild.processed} items indexed`,
		);
	}

	if (failures > 0) {
		throw new LucidError({
			scope: PLUGIN_KEY,
			message: `${failures} of ${results.length} Typesense indexes weren't rebuilt.`,
		});
	}
};

export default rebuild;
