import cliLogger from "../logger.js";
import runTaskCommand from "../services/run-task-command.js";
import type { TaskServerOptions } from "../services/start-task-server.js";

/** Runs Lucid's sync tasks in the runtime. */
const syncCommand = (options?: TaskServerOptions) =>
	runTaskCommand(
		"Sync failed",
		async (run, elapsed) => {
			const { synced } = await run("sync", {});
			if (!synced) return 1;

			cliLogger.log(
				cliLogger.createBadge("LUCID CMS"),
				"Sync completed",
				cliLogger.color.green("successfully"),
				"in",
				cliLogger.color.green(cliLogger.formatMilliseconds(elapsed())),
				{ spaceAfter: true, spaceBefore: true },
			);
			return 0;
		},
		options,
	);

export default syncCommand;
