import confirm from "@inquirer/confirm";
import cliLogger from "../logger.js";
import runPrompt from "../services/run-prompt.js";
import runTaskCommand from "../services/run-task-command.js";
import type { TaskServerOptions } from "../services/start-task-server.js";

/** Drops every database table in the runtime, after confirming unless forced. */
const migrateResetCommand = (
	options?: { force?: boolean } & TaskServerOptions,
) =>
	runTaskCommand(
		"Database reset failed",
		async (run, elapsed) => {
			cliLogger.warn("This will drop all database tables");

			const proceed =
				options?.force ||
				(await runPrompt((output) =>
					confirm(
						{
							message:
								"Are you sure you want to reset the database? This will drop ALL tables and cannot be undone.",
							default: false,
						},
						{ output },
					),
				));
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
