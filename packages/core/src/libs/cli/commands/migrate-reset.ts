import cliLogger from "../logger.js";
import confirmCommand from "../services/confirm-command.js";
import runTaskCommand from "../services/run-task-command.js";
import type { TaskServerOptions } from "../services/start-task-server.js";

/** Drops every database table in the runtime, after confirming unless `--yes` is passed. */
const migrateResetCommand = (options?: { yes?: boolean } & TaskServerOptions) =>
	runTaskCommand(
		"Database reset failed",
		async (run, elapsed) => {
			cliLogger.warn("This will drop all database tables");

			const proceed = await confirmCommand({
				message:
					"Are you sure you want to reset the database? This will drop ALL tables and cannot be undone.",
				yes: options?.yes,
			});
			if (!proceed) {
				cliLogger.info("Reset cancelled");
				return 0;
			}

			cliLogger.info("Dropping all database tables...");
			await run("migrate:reset", {});

			cliLogger.log(
				cliLogger.createBadge("LUCID CMS"),
				"Database reset completed",
				cliLogger.color.green("successfully"),
				"in",
				cliLogger.color.green(cliLogger.formatMilliseconds(elapsed())),
				{ spaceAfter: true, spaceBefore: true },
			);
			return 0;
		},
		options,
	);

export default migrateResetCommand;
