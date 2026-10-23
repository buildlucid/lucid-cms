import type { ServiceContext } from "../../../exports/types.js";
import { syncServices } from "../../../services/index.js";
import cliLogger from "../../cli/logger.js";

/** Syncs locales, collections, roles and agent routines, reporting only failures with `quiet`. */
const runSyncTasks = async (
	context: ServiceContext,
	options?: { quiet?: boolean },
): Promise<boolean> => {
	const quiet = options?.quiet ?? false;
	cliLogger.info("Running sync tasks...", { silent: quiet });

	const [localesResult, collectionsResult, rolesResult, routinesResult] =
		await Promise.all([
			syncServices.syncLocales(context),
			syncServices.syncCollections(context),
			syncServices.syncRoles(context),
			syncServices.syncAgentRoutines(context),
		]);

	for (const [label, result] of [
		["locale", localesResult],
		["collection", collectionsResult],
		["roles", rolesResult],
		["agent routine", routinesResult],
	] as const) {
		if (!result.error) continue;
		cliLogger.error(
			`Sync failed during ${label} sync, with error:`,
			context.translate.english(result.error.message) || "unknown",
		);
		return false;
	}

	cliLogger.success(
		"Sync tasks completed",
		cliLogger.color.green("successfully"),
		{ silent: quiet },
	);
	return true;
};

export default runSyncTasks;
